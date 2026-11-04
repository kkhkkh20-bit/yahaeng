extends Node2D
var game
var font: Font

func _ready() -> void:
	font = load("res://assets/ui/IBM-Plex-Sans-KR.ttf")
	for prop in game.props:
		if prop.name == "crate":
			continue
		var sprite := Sprite2D.new()
		sprite.texture = load("res://assets/props/%s.webp" % prop.name)
		sprite.scale = Vector2.ONE * 0.48
		sprite.position = game.cell(prop.cell) + Vector2(0, -16)
		sprite.z_index = int(game.cell(prop.cell).y) + 3
		sprite.set_meta("floor", prop.floor)
		add_child(sprite)

func title(point: Vector2, text: String, tint := Color("a8adb5"), size := 14) -> void:
	draw_string(font, point, text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, tint)

func marker(point: Vector2, text: String, tint: Color) -> void:
	draw_arc(point, 18, 0, TAU, 32, Color(tint, 0.8), 1.3, true)
	draw_line(point + Vector2(0,-23), point + Vector2(0,-32), tint, 1.4, true)
	var width := font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, 14).x
	draw_rect(Rect2(point + Vector2(-width / 2 - 7,-53), Vector2(width + 14,21)), Color(0.035,0.045,0.07,0.95))
	title(point + Vector2(-width/2,-38), text, tint)

func _draw() -> void:
	if game.player == null:
		return
	var floor_index: int = game.player.floor_index
	var warm := Color("c9b49c")
	var muted := Color("82918e")
	for sprite in get_children():
		sprite.visible = sprite.get_meta("floor") == floor_index
	draw_rect(Rect2(0,0,960,672), Color("101720"))
	for y in range(1,13):
		for x in range(1,19):
			var indoor := x >= 3 and x <= 16 and y >= 3 and y <= 8
			if floor_index == 1 and not indoor:
				continue
			var point := Vector2(x * 48,y * 48)
			var tile := VIPAssets.tile("wood2" if indoor else "stone0" if (x+y)%3 else "stone1")
			draw_texture_rect(tile, Rect2(point,Vector2(48,48)), false, Color("77767b") if indoor else Color("626b73"))
			if indoor:
				draw_rect(Rect2(point, Vector2(48,48)), Color(0.08,0.09,0.12,0.27))
	# Restriction is a readable floor treatment, not a dark visibility filter.
	var restricted := Rect2(624,144,192,288) if floor_index == 0 else Rect2(144,144,672,288)
	draw_rect(restricted, Color(0.53,0.25,0.22,0.08))
	for x in range(int(restricted.position.x)+10,int(restricted.end.x),24):
		draw_line(Vector2(x,restricted.end.y - 7),Vector2(x+10,restricted.end.y-7),Color(0.78,0.43,0.35,0.5),2)
	if floor_index == 0:
		draw_rect(Rect2(169,218,265,166),Color("24262e"))
		draw_rect(Rect2(175,224,253,154),Color("33303a"),false,2)
		title(Vector2(170,204),"클럽 · 공개 구역",warm,16)
		title(Vector2(641,406),"직원 전용",Color("be8c7b"),15)
		draw_rect(Rect2(435,496,155,116),Color(0.07,0.09,0.1,0.38))
		title(Vector2(450,624),"흡연 구역",warm,14)
		draw_rect(Rect2(57,501,41,104),Color(0.3,0.52,0.5,0.12))
		title(Vector2(48,484),"골목 출구",Color("9bc5bd"),14)
		if not game.uniform:
			marker(game.uniform_point,"직원복 · 선택",muted)
	else:
		title(Vector2(171,178),"장부 보관실 · 출입 금지",Color("ce9d89"),17)
		title(Vector2(539,402),"보안 통로",warm,15)
		if not game.ledger:
			marker(game.ledger_point,"장부",Color("d9c1a0"))
			draw_texture_rect(VIPAssets.tile("it_scroll"),Rect2(game.ledger_point-Vector2(10,10),Vector2(20,20)),false)
	# Architectural wall finish: shadow, stone face, chamfer and fine cap.
	for p in game.walls[floor_index]:
		if game.walls[floor_index][p] == "prop":
			continue
		var rect := Rect2(Vector2(p) * 48,Vector2(48,48))
		draw_rect(Rect2(rect.position+Vector2(5,8),rect.size),Color(0,0,0,0.25))
		draw_rect(rect,Color("272e36"))
		draw_rect(Rect2(rect.position+Vector2(3,3),rect.size-Vector2(6,6)),Color("343d45"))
		draw_line(rect.position+Vector2(2,2),rect.position+Vector2(46,2),Color("75808a"),1)
		draw_line(rect.position+Vector2(2,45),rect.position+Vector2(46,45),Color("151e27"),3)
		if p.y == 2 and p.x%3 == 1:
			draw_rect(Rect2(rect.position+Vector2(9,12),Vector2(30,21)),Color("17212c"))
			draw_rect(Rect2(rect.position+Vector2(12,14),Vector2(24,16)),Color("8e8065"))
	for door in game.doors:
		if door.floor != floor_index:
			continue
		var center: Vector2 = door.body.position
		draw_rect(Rect2(center-Vector2(24,8),Vector2(48,16)),Color("121a23"))
		if door.open:
			draw_rect(Rect2(center-Vector2(24,5),Vector2(7,36)),Color("7d7365"))
		else:
			draw_rect(Rect2(center-Vector2(24,6),Vector2(48,12)),Color("7d7365"))
			draw_line(center+Vector2(-20,-5),center+Vector2(20,-5),Color("b2a28d"),1.5)
			draw_circle(center+Vector2(12,0),2,Color("d4c2a8"))
	# Explicit connected stair landings on both floors.
	draw_rect(Rect2(game.stair_point-Vector2(24,24),Vector2(48,48)),Color("232e3a"))
	for i in range(6):
		draw_line(game.stair_point+Vector2(-20,-19+i*7),game.stair_point+Vector2(20,-19+i*7),Color("839197"),2)
	title(game.stair_point+Vector2(-31,-36),"↑ 2층" if floor_index == 0 else "↓ 1층",warm,15)
	for prop in game.props:
		if prop.floor == floor_index and prop.name == "crate":
			draw_texture_rect(VIPAssets.tile("crate"),Rect2(Vector2(prop.cell)*48,Vector2(48,48)),false,Color("a6a6a6"))
	for actor in game.actors:
		if actor.floor_index != floor_index:
			continue
		draw_set_transform(actor.position,0,Vector2(1,0.37))
		draw_circle(Vector2(0,9),16 if not actor.down else 24,Color(0,0,0,0.33))
		draw_set_transform(Vector2.ZERO)
		if actor.down:
			title(actor.position+Vector2(-23,-16),"사망" if actor.dead else "기절",Color("c1b7ae"),12)
		elif actor.role == "target":
			title(actor.position+Vector2(-15,-64),"실장",Color("d5b39b"),13)
	for effect in game.effects:
		if effect.floor != floor_index:
			continue
		var data: Dictionary = game.effects_meta.effects[effect.kind]
		var index := mini(int(float(effect.time)*float(data.fps)),data.frames.size()-1)
		var r: Array = data.frames[index]
		var origin: Array = data.origin
		draw_texture_rect_region(game.effects_atlas,Rect2(effect.point-Vector2(origin[0],origin[1]),Vector2(r[2],r[3])),Rect2(r[0],r[1],r[2],r[3]))

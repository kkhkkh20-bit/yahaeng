extends Control
var game
var font: Font
var joystick := Vector2.ZERO
var joy_id := -1
var attack_id := -1
var touch_mode := false
var icons: Dictionary = {}
var joy_center := Vector2.ZERO
var buttons: Dictionary = {}

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	font = load("res://assets/ui/IBM-Plex-Sans-KR.ttf")
	touch_mode = DisplayServer.is_touchscreen_available() or OS.has_feature("android") or OS.has_feature("ios")
	if OS.has_feature("web"):
		touch_mode = bool(JavaScriptBridge.eval("matchMedia('(pointer:coarse)').matches"))
	for key in ["attack","action","crouch","whistle"]:
		icons[key] = load("res://assets/ui/%s.svg" % key)

func text(point: Vector2, value: String, size_value := 17, tint := Color("dfe1e4")) -> void:
	draw_string(font,point,value,HORIZONTAL_ALIGNMENT_LEFT,-1,size_value,tint)

func panel(rect: Rect2, tint := Color(0.055,0.07,0.095,0.96), radius := 10) -> void:
	var style := StyleBoxFlat.new()
	style.bg_color = tint
	style.border_color = Color("49515a")
	style.set_border_width_all(1)
	style.set_corner_radius_all(radius)
	style.shadow_color = Color(0,0,0,0.25)
	style.shadow_size = 5
	draw_style_box(style,rect)

func _process(_dt: float) -> void:
	queue_redraw()
	if game.paused or game.finished:
		joystick = Vector2.ZERO
		joy_id = -1
		attack_id = -1

func layout() -> void:
	joy_center = Vector2(112,size.y-112)
	buttons = {
		"attack": {"p": Vector2(size.x-99,size.y-106),"r": 49.0},
		"action": {"p": Vector2(size.x-207,size.y-100),"r": 39.0},
		"crouch": {"p": Vector2(size.x-101,size.y-216),"r": 31.0},
		"whistle": {"p": Vector2(size.x-211,size.y-196),"r": 29.0}}

func _draw() -> void:
	layout()
	var muted := Color("929ea9")
	var warm := Color("d5bea2")
	if not game.started or game.finished or game.paused:
		draw_rect(Rect2(Vector2.ZERO,size),Color(0.02,0.03,0.05,0.83))
		var w := minf(650,size.x-48)
		var h := 472.0 if not game.finished and not game.paused else 326.0
		var origin := (size-Vector2(w,h))/2
		panel(Rect2(origin,Vector2(w,h)))
		var x := origin.x+34
		var y := origin.y+40
		text(Vector2(x,y),"야행",44,warm)
		text(Vector2(x+104,y-3),"VIP · GODOT 비교판",16,muted)
		if game.finished:
			text(Vector2(x,y+61),"의뢰 완료" if game.won else "작전 실패",27)
			text(Vector2(x,y+106),"실장 제거 · 장부 회수 · 골목 탈출" if game.won else "경비 시야와 출입 구역을 확인하고 다시 시도하세요",17,muted)
			text(Vector2(x,y+145),"플레이 %d초  ·  신원 발각 %d회  ·  시신 발견 %d회" % [int(game.elapsed),game.detections,game.body_discoveries],16,warm)
		elif game.paused:
			text(Vector2(x,y+62),"일시정지",28)
			text(Vector2(x,y+110),"경비의 부채꼴은 실제 시야입니다. 벽과 닫힌 문에 막힙니다.",16,muted)
			text(Vector2(x,y+148),"직원복은 1층에만 통합니다. 2층 보관실은 누구든 발각됩니다.",16,muted)
		else:
			text(Vector2(x,y+59),"오늘 밤, 실장과 장부를 처리한다.",25)
			text(Vector2(x,y+103),"01   흡연 구역의 실장 뒤로 접근 → 길게 공격해 제거",18)
			text(Vector2(x,y+144),"02   직원 계단으로 2층 진입 → 장부 회수",18)
			text(Vector2(x,y+185),"03   계단을 내려와 왼쪽 골목으로 탈출",18)
			draw_line(Vector2(x,y+207),Vector2(origin.x+w-34,y+207),Color("3e4852"),1)
			text(Vector2(x,y+239),"직원복은 선택입니다. 1층 직원 구역만 통과할 수 있습니다.",16,muted)
			text(Vector2(x,y+270),"기술 해금 없이 모두 사용 · 뒤에서 짧게 공격: 기절 / 길게: 제거",16,muted)
			text(Vector2(x,y+303),"왼쪽 스틱 이동 · 끝까지 밀면 달리기   /   오른쪽 원형 버튼 행동" if touch_mode else "이동 WASD / 방향키   ·   웅크리기 Ctrl   ·   달리기 Shift",15,muted)
			text(Vector2(x,y+330),"공격 버튼 길게: 제거   ·   행동: 옷·장부·문   ·   유인: 휘파람" if touch_mode else "공격 Z   ·   행동 E 또는 X   ·   유인 V   ·   일시정지 Esc",15,muted)
		var button := Rect2(origin+Vector2(34,h-72),Vector2(w-68,46))
		panel(button,Color("2d3f49"),7)
		var label := "다시 시도" if game.finished else "계속하기" if game.paused else "작전 시작"
		if not touch_mode:
			label += "   " + ("R" if game.finished else "Esc" if game.paused else "Enter")
		text(button.position+Vector2((button.size.x-font.get_string_size(label,HORIZONTAL_ALIGNMENT_LEFT,-1,20).x)/2,30),label,20)
		text(Vector2(origin.x+8,origin.y+h+25),"기존 리소스 재사용 · 2개 층의 작은 비교 구역 · 기존 캠페인은 별도 유지",13,muted)
		return
	# The two concrete objectives stay visible for the whole mission.
	panel(Rect2(20,16,minf(size.x-110,760),76))
	text(Vector2(36,39),"VIP  /  의뢰 01",13,muted)
	text(Vector2(36,66),("[완] " if game.target.dead else "◇ ")+"실장 제거",20,Color("86afa6") if game.target.dead else warm)
	text(Vector2(213,66),("[완] " if game.ledger else "◇ ")+"2층 장부 회수",20,Color("86afa6") if game.ledger else warm)
	text(Vector2(440,66),("→ " if game.target.dead and game.ledger else "◇ ")+"왼쪽 골목 탈출",19,Color("86afa6") if game.target.dead and game.ledger else muted)
	panel(Rect2(size.x-76,16,56,48))
	text(Vector2(size.x-61,46),"Ⅱ",23)
	text(Vector2(24,116),("직원복" if game.uniform else "평상복")+"  ·  "+game.access_text(),15,Color("d29280") if game.trespassing() else Color("aab8bd"))
	for i in range(3):
		draw_rect(Rect2(25+i*22,130,16,4),Color("b7c5c7") if i<game.hp else Color("3a424d"))
	if game.player.covered:
		text(Vector2(104,140),"벽 엄폐",14,warm)
	if game.tip_time > 0:
		var width := minf(size.x-48,font.get_string_size(game.tip,HORIZONTAL_ALIGNMENT_LEFT,-1,16).x+32)
		var pos := Vector2((size.x-width)/2,size.y-52)
		panel(Rect2(pos,Vector2(width,36)))
		text(pos+Vector2(16,24),game.tip,16,warm)
	var choice: Dictionary = game.context()
	var candidate: VIPActor = game.attack_candidate()
	if touch_mode:
		draw_circle(joy_center,70,Color(0.04,0.06,0.09,0.68))
		draw_arc(joy_center,70,0,TAU,64,Color("5b6771"),1.5,true)
		draw_circle(joy_center+joystick*44,26,Color(0.49,0.57,0.61,0.7))
		for key in buttons:
			var b: Dictionary = buttons[key]
			var active_button: bool = (key=="crouch" and game.player.crouched) or (key=="attack" and game.attack_active) or (key=="action" and not choice.is_empty())
			draw_circle(b.p,b.r,Color("263e49") if active_button else Color(0.055,0.075,0.105,0.9))
			draw_arc(b.p,b.r,0,TAU,56,warm if active_button else Color("74818a"),1.5,true)
			draw_arc(b.p-Vector2(0,1),b.r-4,PI*1.1,PI*1.7,18,Color(0.85,0.87,0.89,0.12),1,true)
			var icon_size := 31.0 if key in ["attack","action"] else 24.0
			draw_texture_rect(icons[key],Rect2(b.p-Vector2(icon_size/2,icon_size/2+5),Vector2.ONE*icon_size),false,Color("d9d5cf"))
			var label: String = {"attack":"공격","action":"행동","crouch":"웅크림","whistle":"유인"}[key]
			text(b.p+Vector2(-font.get_string_size(label,HORIZONTAL_ALIGNMENT_LEFT,-1,12).x/2,b.r-11),label,12)
			if key=="attack" and game.attack_active:
				draw_arc(b.p,b.r+4,-PI/2,-PI/2+TAU*minf(1,game.attack_held/0.85),42,Color("d49b85"),3,true)
	else:
		text(Vector2(24,size.y-19),"WASD 이동     Ctrl 웅크림     Shift 달리기     Z 짧게 기절 / 길게 제거     E 행동     V 유인",14,muted)
	if not choice.is_empty():
		var point: Vector2 = game.camera.get_canvas_transform() * choice.point
		var label := ("행동 · " if touch_mode else "E  ·  ")+str(choice.label)
		var w := font.get_string_size(label,HORIZONTAL_ALIGNMENT_LEFT,-1,16).x+24
		panel(Rect2(point+Vector2(-w/2,27),Vector2(w,31)))
		text(point+Vector2(-w/2+12,48),label,16,warm)
	if candidate != null:
		var point: Vector2 = game.camera.get_canvas_transform() * candidate.position
		var label := "뒤로 접근" if not game.behind(candidate) else "짧게 기절 · 길게 제거"
		var w := font.get_string_size(label,HORIZONTAL_ALIGNMENT_LEFT,-1,15).x
		text(point+Vector2(-w/2,-63),label,15,warm)

func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed:
			touch_mode = true
			down(event.position,event.index)
		else:
			up(event.index)
	elif event is InputEventScreenDrag:
		if event.index == joy_id:
			joystick = ((event.position-joy_center)/55).limit_length()
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		down(event.position,-2)

func down(point: Vector2, pointer: int) -> void:
	if not game.started or game.finished or game.paused:
		var w := minf(650,size.x-48)
		var h := 472.0 if not game.finished and not game.paused else 326.0
		var origin := (size-Vector2(w,h))/2
		if Rect2(origin+Vector2(34,h-72),Vector2(w-68,46)).has_point(point):
			if game.finished:
				game.get_tree().reload_current_scene()
			elif game.paused:
				game.paused = false
			else:
				game.begin()
		return
	if Rect2(size.x-76,16,56,48).has_point(point):
		game.paused = true
		game.attack_active = false
		return
	if not touch_mode:
		return
	layout()
	if point.distance_to(joy_center) < 90 and joy_id < 0:
		joy_id = pointer
		joystick = ((point-joy_center)/55).limit_length()
		return
	for key in buttons:
		var b: Dictionary = buttons[key]
		if point.distance_to(b.p) > b.r:
			continue
		match key:
			"attack":
				attack_id = pointer
				game.start_attack()
			"action":
				game.interact()
			"crouch":
				game.player.crouched = not game.player.crouched
			"whistle":
				game.whistle()

func up(pointer: int) -> void:
	if pointer == joy_id:
		joy_id = -1
		joystick = Vector2.ZERO
	if pointer == attack_id:
		game.end_attack()
		attack_id = -1

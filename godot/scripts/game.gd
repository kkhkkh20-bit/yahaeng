extends Node2D
## A standalone, deliberately small comparison level; the browser campaign stays intact.
const TILE := 48
const WIDTH := 20
const HEIGHT := 14
const Actor = preload("res://scripts/actor.gd")
const MapView = preload("res://scripts/map_view.gd")
const HUD = preload("res://scripts/hud.gd")
var player: VIPActor
var target: VIPActor
var actors: Array[VIPActor] = []
var walls: Array[Dictionary] = [{}, {}]
var grids: Array[AStarGrid2D] = []
var doors: Array[Dictionary] = []
var props: Array[Dictionary] = []
var camera: Camera2D
var map_view: Node2D
var hud: Control
var elapsed := 0.0
var started := false
var paused := false
var finished := false
var won := false
var hp := 3
var uniform := false
var ledger := false
var detections := 0
var body_discoveries := 0
var tip := ""
var tip_time := 0.0
var attack_active := false
var attack_held := 0.0
var takedown: VIPActor
var takedown_lethal := false
var takedown_time := 0.0
var whistle_cooldown := 0.0
var stair_point := cell(Vector2i(15, 4))
var uniform_point := cell(Vector2i(16, 11))
var ledger_point := cell(Vector2i(4, 4))
var exit_point := cell(Vector2i(1, 11))
var effects: Array[Dictionary] = []
var effects_meta: Dictionary
var effects_atlas: Texture2D
var sounds: Dictionary = {}
var audio_pool: Array[AudioStreamPlayer] = []
var diagnostics_time := 0.0
var inspect_callback: JavaScriptObject

func _inspect_web(_args: Array) -> void:
	JavaScriptBridge.eval("window.yahaengGodotState = " + JSON.stringify(checkpoint_info()) + ";")

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT and started and not finished:
		paused = true
		attack_active = false
		if hud != null:
			hud.joystick = Vector2.ZERO

func _process(dt: float) -> void:
	if hud != null and hud.touch_mode and get_viewport_rect().size.y > get_viewport_rect().size.x and started and not finished:
		paused = true
	if OS.has_feature("web"):
		diagnostics_time -= dt
		if diagnostics_time <= 0 and player != null:
			diagnostics_time = 0.25
			# Canvas stretching may keep a landscape logical viewport in portrait.
			# Match the browser overlay's actual media query instead.
			if started and not finished and bool(JavaScriptBridge.eval("matchMedia('(orientation:portrait) and (pointer:coarse)').matches")):
				paused = true
				attack_active = false
			_inspect_web([])

static func cell(p: Vector2i) -> Vector2:
	return Vector2(p) * TILE + Vector2.ONE * TILE / 2

func _ready() -> void:
	VIPAssets.boot()
	effects_meta = JSON.parse_string(FileAccess.get_file_as_string("res://assets/fx/pixelfx.json"))
	effects_atlas = load("res://assets/fx/pixelfx.webp")
	build_level()
	map_view = MapView.new()
	map_view.game = self
	add_child(map_view)
	player = spawn("player", "hero", cell(Vector2i(3, 11)), 0)
	player.face = Vector2.RIGHT
	target = spawn("target", "suit", cell(Vector2i(10, 11)), 0)
	target.face = Vector2.UP
	var guard := spawn("guard", "male", cell(Vector2i(8, 5)), 0)
	guard.face = Vector2.RIGHT
	guard.patrol = [cell(Vector2i(8, 5)), cell(Vector2i(15, 5)), cell(Vector2i(15, 7)), cell(Vector2i(8, 7))]
	var upstairs := spawn("guard", "male", cell(Vector2i(12, 5)), 1)
	upstairs.face = Vector2.LEFT
	upstairs.patrol = [cell(Vector2i(12, 5)), cell(Vector2i(15, 7)), cell(Vector2i(6, 7)), cell(Vector2i(6, 4))]
	camera = Camera2D.new()
	camera.position = Vector2(WIDTH * TILE / 2.0, HEIGHT * TILE / 2.0)
	add_child(camera)
	var canvas := CanvasLayer.new()
	add_child(canvas)
	hud = HUD.new()
	hud.game = self
	canvas.add_child(hud)
	get_viewport().size_changed.connect(resize)
	resize()
	for i in range(8):
		var audio := AudioStreamPlayer.new()
		add_child(audio)
		audio_pool.append(audio)
	for name in ["step_c0", "kill", "thud", "cloth", "question", "alert", "win", "lose", "click"]:
		sounds[name] = load("res://assets/audio/%s.mp3" % name)
	if OS.has_feature("web"):
		inspect_callback = JavaScriptBridge.create_callback(_inspect_web)
		JavaScriptBridge.get_interface("window").yahaengGodotInspect = inspect_callback
		JavaScriptBridge.eval("window.yahaengGodotReady = true;")
	print("VIP_READY: Godot native 2D; two collision floors; original assets")

func resize() -> void:
	var size := get_viewport_rect().size
	var fit := minf((size.x - 40) / (WIDTH * TILE), (size.y - 190) / (HEIGHT * TILE))
	camera.zoom = Vector2.ONE * maxf(0.2, fit)
	camera.offset = Vector2(0, -32 / camera.zoom.x)
	hud.size = size

func spawn(role: String, body: String, point: Vector2, which_floor: int) -> VIPActor:
	var actor := Actor.new()
	actor.game = self
	actor.role = role
	actor.body = body
	actor.position = point
	actor.floor_index = which_floor
	actors.append(actor)
	add_child(actor)
	return actor

func add_wall(p: Vector2i, which_floor: int, kind := "wall") -> void:
	walls[which_floor][p] = kind
	var obstacle := StaticBody2D.new()
	obstacle.position = cell(p)
	obstacle.collision_layer = 1 << which_floor
	obstacle.collision_mask = 0
	obstacle.set_meta("cover", true)
	var collider := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = Vector2(TILE, TILE)
	collider.shape = shape
	obstacle.add_child(collider)
	add_child(obstacle)

func add_door(p: Vector2i, which_floor: int, title: String, initially_open := false) -> void:
	var barrier := StaticBody2D.new()
	barrier.position = cell(p)
	barrier.collision_layer = 0 if initially_open else 1 << which_floor
	barrier.collision_mask = 0
	var collider := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = Vector2(TILE, 13)
	collider.shape = shape
	barrier.add_child(collider)
	add_child(barrier)
	doors.append({"cell": p, "floor": which_floor, "title": title, "open": initially_open, "body": barrier})

func build_level() -> void:
	for f in range(2):
		for x in range(WIDTH):
			add_wall(Vector2i(x, 0), f)
			add_wall(Vector2i(x, HEIGHT - 1), f)
		for y in range(1, HEIGHT - 1):
			add_wall(Vector2i(0, y), f)
			add_wall(Vector2i(WIDTH - 1, y), f)
		for x in range(2, 18):
			add_wall(Vector2i(x, 2), f)
			if x != 9:
				add_wall(Vector2i(x, 9), f)
		for y in range(3, 9):
			add_wall(Vector2i(2, y), f)
			add_wall(Vector2i(17, y), f)
		if f == 0:
			for y in range(3, 9):
				if y != 6:
					add_wall(Vector2i(12, y), f)
			add_door(Vector2i(9, 9), f, "클럽 출입문", true)
			add_door(Vector2i(12, 6), f, "직원 구역 문", true)
		else:
			# The office floor is bounded by the same building, without fake outside access.
			add_wall(Vector2i(9, 9), f)
			for y in range(3, 9):
				if y != 5:
					add_wall(Vector2i(10, y), f)
			add_door(Vector2i(10, 5), f, "장부 보관실 문", true)
	var placements := [
		["bar", 5, 3, 0], ["sofa", 4, 6, 0], ["tableS", 7, 6, 0],
		["plant", 16, 3, 0], ["cab", 14, 3, 0],
		["desk", 4, 3, 1], ["cab", 3, 3, 1], ["plant", 16, 3, 1],
		["sofa", 14, 8, 1], ["crate", 7, 10, 0]]
	for entry in placements:
		var p := Vector2i(entry[1], entry[2])
		add_wall(p, entry[3], "prop")
		props.append({"name": entry[0], "cell": p, "floor": entry[3]})
	for f in range(2):
		var grid := AStarGrid2D.new()
		grid.region = Rect2i(0, 0, WIDTH, HEIGHT)
		grid.cell_size = Vector2(TILE, TILE)
		grid.offset = Vector2.ONE * TILE / 2
		grid.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES
		grid.update()
		for p in walls[f]:
			grid.set_point_solid(p)
		if f == 1:
			for x in range(WIDTH):
				for y in range(HEIGHT):
					if x < 3 or x > 16 or y < 3 or y > 8:
						grid.set_point_solid(Vector2i(x, y))
		grids.append(grid)

func find_path(from: Vector2, to: Vector2, which_floor: int) -> PackedVector2Array:
	var a := Vector2i(from / TILE)
	var b := Vector2i(to / TILE)
	var grid := grids[which_floor]
	if not grid.is_in_boundsv(a) or not grid.is_in_boundsv(b) or grid.is_point_solid(a) or grid.is_point_solid(b):
		return PackedVector2Array()
	var points := grid.get_point_path(a, b)
	# The start-cell centre is behind a moving actor after every repath.
	# Keeping it makes patrols repeatedly turn back instead of advancing.
	if points.size() > 1:
		points.remove_at(0)
	elif points.size() == 1:
		points[0] = to
	return points

func clear_line(from: Vector2, to: Vector2, which_floor: int) -> bool:
	var query := PhysicsRayQueryParameters2D.create(from, to, 1 << which_floor)
	return get_world_2d().direct_space_state.intersect_ray(query).is_empty()

func move_axis() -> Vector2:
	var direction := Vector2(
		int(Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT)) - int(Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT)),
		int(Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN)) - int(Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP)))
	return hud.joystick if hud.joystick.length() > 0.05 else direction.limit_length()

func _input(event: InputEvent) -> void:
	if not event is InputEventKey or event.echo:
		return
	if event.pressed:
		match event.physical_keycode:
			KEY_ENTER, KEY_SPACE:
				if not started:
					begin()
			KEY_ESCAPE:
				if started and not finished:
					paused = not paused
			KEY_CTRL:
				if active():
					player.crouched = not player.crouched
			KEY_E, KEY_X:
				if active():
					interact()
			KEY_V:
				if active():
					whistle()
			KEY_Z:
				if active():
					start_attack()
			KEY_R:
				if finished:
					get_tree().reload_current_scene()
	elif event.physical_keycode == KEY_Z:
		end_attack()

func active() -> bool:
	return started and not paused and not finished

func begin() -> void:
	started = true
	sound("click", -15)
	message("실장은 흡연 구역에 있습니다 · 뒤로 접근해 Z를 길게 누르세요", 6)

func _physics_process(dt: float) -> void:
	if not active():
		attack_active = false
		return
	elapsed += dt
	tip_time = maxf(0, tip_time - dt)
	whistle_cooldown = maxf(0, whistle_cooldown - dt)
	if attack_active:
		attack_held += dt
		if attack_held >= 0.85:
			attack_active = false
			perform_attack(true)
	if takedown_time > 0:
		takedown_time -= dt
		if takedown_time <= 0 and is_instance_valid(takedown):
			takedown.incapacitate(takedown_lethal)
			sound("kill" if takedown_lethal else "thud", -12)
			if takedown == target:
				message("실장 제거 완료 · 직원 계단을 올라 장부를 회수하세요" if takedown_lethal else "실장이 기절했습니다 · 제거하려면 다시 길게 공격", 5)
	for i in range(effects.size() - 1, -1, -1):
		effects[i].time += dt
		var data: Dictionary = effects_meta.effects[effects[i].kind]
		if effects[i].time >= float(data.duration):
			effects.remove_at(i)
	map_view.queue_redraw()

func trespassing() -> bool:
	return player.floor_index == 1 or (player.position.x > TILE * 12.5 and player.position.y < TILE * 9 and not uniform)

func access_text() -> String:
	if player.floor_index == 1:
		return "2층 보관실 · 모든 복장 출입 금지"
	if player.position.y < TILE * 9 and player.position.x > TILE * 12.5:
		return "직원 구역 · 직원복 허용" if uniform else "직원 구역 · 평상복 출입 금지"
	return "공개 구역 · 평상복도 출입 가능"

func auto_stair(actor: VIPActor) -> void:
	if actor.stair_cooldown > 0 or actor.position.distance_to(stair_point) > 18:
		return
	var old_floor := actor.floor_index
	var next_floor := 1 - old_floor
	# A guard only learns the transition when actually witnessing the stair entry.
	for guard in actors:
		if guard.role == "guard" and not guard.down and guard.state in ["chase", "suspicious", "search"] and guard.sees(actor.position, old_floor):
			guard.remember(stair_point + Vector2(-27, 0), next_floor)
	actor.set_floor(next_floor)
	actor.position = stair_point + Vector2(-27, 0)
	actor.stair_cooldown = 1.1
	if actor == player:
		message("2층 장부 보관실 · 어떤 복장도 통하지 않습니다" if next_floor == 1 else "1층으로 내려왔습니다", 4)
		sound("cloth", -18)

func door_blocker(door: Dictionary) -> VIPActor:
	for actor in actors:
		if actor.floor_index == door.floor and absf(actor.position.x - door.body.position.x) < 35 and absf(actor.position.y - door.body.position.y) < 23:
			return actor
	return null

func toggle_door(door: Dictionary) -> bool:
	if door.open:
		var blocker := door_blocker(door)
		if blocker != null:
			message("문을 닫을 수 없음 · " + ("내가 문 앞에 있습니다" if blocker == player else "쓰러진 사람이 걸려 있습니다" if blocker.down else "사람이 지나가고 있습니다"), 2.5)
			return false
	door.open = not door.open
	door.body.collision_layer = 0 if door.open else 1 << int(door.floor)
	sound("click", -18)
	return true

func open_guard_door(guard: VIPActor) -> void:
	for door in doors:
		if door.floor == guard.floor_index and not door.open and guard.position.distance_to(door.body.position) < 58 and guard.velocity.length() > 0:
			toggle_door(door)

func context() -> Dictionary:
	var best: Dictionary = {}
	var distance := 65.0
	var choices: Array[Dictionary] = []
	if player.floor_index == 0:
		if not uniform:
			choices.append({"kind": "uniform", "point": uniform_point, "label": "직원복으로 갈아입기"})
		choices.append({"kind": "exit", "point": exit_point, "label": "골목으로 탈출" if target.dead and ledger else "탈출 · 실장 제거와 장부 필요"})
	elif not ledger:
		choices.append({"kind": "ledger", "point": ledger_point, "label": "장부 회수"})
	for door in doors:
		if door.floor == player.floor_index:
			choices.append({"kind": "door", "point": door.body.position, "door": door, "label": door.title + (" 닫기" if door.open else " 열기")})
	for choice in choices:
		var d: float = player.position.distance_to(choice.point)
		if d < distance:
			distance = d
			best = choice
	return best

func interact() -> void:
	if player.action_time > 0:
		return
	var choice := context()
	if choice.is_empty():
		message("상호작용할 대상 가까이로 이동하세요", 2)
		return
	match choice.kind:
		"door":
			toggle_door(choice.door)
		"uniform":
			uniform = true
			player.sprite.material = VIPAssets.material("uniform")
			sound("cloth", -10)
			message("직원복 · 1층 직원 구역 허용 / 2층 보관실은 여전히 출입 금지", 6)
		"ledger":
			ledger = true
			fx("loot", ledger_point)
			sound("cloth", -10)
			message("장부 회수 완료 · " + ("계단을 내려가 왼쪽 골목으로 탈출하세요" if target.dead else "흡연 구역의 실장을 제거하세요"), 6)
		"exit":
			if target.dead and ledger:
				finished = true
				won = true
				sound("win", -12)
			else:
				message("아직 할 일이 있습니다 · " + ("실장 제거" if not target.dead else "2층 장부 회수"), 4)

func attack_candidate() -> VIPActor:
	var best: VIPActor
	var nearest := 57.0
	for actor in actors:
		if actor == player or actor.floor_index != player.floor_index or actor.dead:
			continue
		var distance := player.position.distance_to(actor.position)
		if distance < nearest and clear_line(player.position, actor.position, player.floor_index):
			best = actor
			nearest = distance
	return best

func behind(actor: VIPActor) -> bool:
	return actor.down or actor.face.dot(actor.position.direction_to(player.position)) < -0.2

func start_attack() -> void:
	if player.action_time <= 0:
		attack_active = true
		attack_held = 0

func end_attack() -> void:
	if attack_active and active():
		attack_active = false
		perform_attack(false)
	attack_active = false

func perform_attack(lethal: bool) -> void:
	var actor := attack_candidate()
	if actor == null:
		message("대상 뒤에 가까이 접근하세요 · 짧게: 기절 / 길게: 제거", 3)
		return
	if not behind(actor):
		message("정면에서는 암살할 수 없습니다 · 시야를 피해 뒤로 접근하세요", 3)
		return
	if actor.down and not lethal:
		message("이미 기절한 대상입니다 · 길게 눌러 제거", 3)
		return
	player.face = player.position.direction_to(actor.position)
	player.action_anim = "stab" if lethal else "choke"
	player.action_time = 0.85
	actor.action_time = 0.85
	actor.action_anim = "stabbed" if lethal else "choked"
	takedown = actor
	takedown_lethal = lethal
	takedown_time = 0.68

func whistle() -> void:
	if whistle_cooldown > 0:
		return
	whistle_cooldown = 3
	fx("shock", player.position)
	sound("question", -15)
	var heard := false
	for guard in actors:
		if guard.role == "guard" and not guard.down and guard.floor_index == player.floor_index and guard.position.distance_to(player.position) < 250 and guard.state != "chase":
			guard.state = "search"
			guard.remember(player.position, player.floor_index)
			heard = true
	message("휘파람 · 경비가 소리가 난 위치를 확인합니다" if heard else "휘파람 · 들은 경비가 없습니다", 3)

func hurt() -> void:
	hp -= 1
	fx("hit", player.position)
	sound("thud", -10)
	message("공격받았습니다 · 달려서 거리를 벌리고 벽 뒤로 숨으세요", 3)
	if hp <= 0:
		finished = true
		won = false
		sound("lose", -12)

func fx(kind: String, point: Vector2) -> void:
	if effects_meta.effects.has(kind):
		effects.append({"kind": kind, "point": point, "floor": player.floor_index, "time": 0.0})

func sound(name: String, volume := -12.0) -> void:
	if not started:
		return
	for channel in audio_pool:
		if not channel.playing:
			channel.stream = sounds[name]
			channel.volume_db = volume
			channel.play()
			return

func message(text: String, duration := 4.0) -> void:
	tip = text
	tip_time = duration

func checkpoint_info() -> Dictionary:
	## Read-only diagnostics used by the test runner; no gameplay state mutation API.
	var guards: Array = []
	for actor in actors:
		if actor.role == "guard":
			guards.append({"floor": actor.floor_index, "x": actor.position.x, "y": actor.position.y, "state": actor.state, "memory_floor": actor.memory_floor})
	return {"floor": player.floor_index, "x": player.position.x, "y": player.position.y, "uniform": uniform, "ledger": ledger, "target_dead": target.dead, "hp": hp, "won": won, "started": started, "paused": paused, "elapsed": elapsed, "detections": detections, "guards": guards, "crouched": player.crouched, "covered": player.covered, "touch_controls": hud.touch_mode, "viewport": [hud.size.x,hud.size.y], "speed": player.velocity.length()}

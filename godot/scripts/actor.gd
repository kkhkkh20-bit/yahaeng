class_name VIPActor
extends CharacterBody2D

var game
var role := "guard"
var floor_index := 0
var home_floor := 0
var face := Vector2.DOWN
var body := "male"
var sprite: AnimatedSprite2D
var crouched := false
var covered := false
var down := false
var dead := false
var suspicion := 0.0
var state := "patrol"
var patrol: Array[Vector2] = []
var waypoint := 0
var memory := Vector2.ZERO
var memory_floor := 0
var search_time := 0.0
var path: PackedVector2Array = []
var repath := 0.0
var hit_cooldown := 0.0
var stair_cooldown := 0.0
var action_time := 0.0
var action_anim := ""
var cover_time := 0.0
var cone := PackedVector2Array()
var spotted_bodies: Dictionary = {}
var step_time := 0.0
var recognized := false
var lost_time := 0.0
var strike_time := 0.0

func _ready() -> void:
	collision_layer = 0
	home_floor = floor_index
	set_floor(floor_index)
	var collider := CollisionShape2D.new()
	var shape := CircleShape2D.new()
	shape.radius = 11
	collider.shape = shape
	add_child(collider)
	sprite = AnimatedSprite2D.new()
	sprite.sprite_frames = VIPAssets.actor_frames(body)
	sprite.centered = false
	sprite.material = VIPAssets.material(role)
	add_child(sprite)
	visual()

func set_floor(value: int) -> void:
	floor_index = value
	collision_mask = 1 << floor_index
	path.clear()
	repath = 0

func _physics_process(dt: float) -> void:
	visible = game.player != null and floor_index == game.player.floor_index
	if game.paused or game.finished or not game.started:
		return
	stair_cooldown = maxf(0, stair_cooldown - dt)
	hit_cooldown = maxf(0, hit_cooldown - dt)
	if action_time > 0:
		action_time -= dt
		velocity = Vector2.ZERO
	elif down:
		velocity = Vector2.ZERO
	elif role == "player":
		move_player(dt)
	elif role == "target":
		face = Vector2.UP.rotated(sin(game.elapsed * 0.3) * 0.28)
	else:
		move_guard(dt)
	visual()
	queue_redraw()

func move_player(dt: float) -> void:
	var axis: Vector2 = game.move_axis()
	var speed := 94.0 if crouched else 148.0
	if (Input.is_key_pressed(KEY_SHIFT) or (game.hud.touch_mode and game.hud.joystick.length() > 0.96)) and not crouched:
		speed = 210
	if axis.length() > 0.05:
		face = axis.normalized()
	velocity = axis.limit_length() * speed
	move_and_slide()
	var broad_wall := false
	for i in range(get_slide_collision_count()):
		var collision := get_slide_collision(i)
		if collision.get_collider().get_meta("cover", false):
			broad_wall = true
	if crouched and broad_wall:
		cover_time += dt
	elif not (crouched and covered and axis.length() < 0.1):
		cover_time = 0
	covered = cover_time > 0.35
	if axis.length() > 0.1:
		step_time -= dt
		if step_time <= 0:
			step_time = 0.5 if crouched else 0.31
			game.sound("step_c0", -25 if crouched else -18)
	game.auto_stair(self)

func sees(point: Vector2, which_floor: int, range_limit := 260.0, full_circle := false) -> bool:
	if which_floor != floor_index or position.distance_to(point) > range_limit:
		return false
	var offset := point - position
	if not full_circle and offset.length() > 30 and face.dot(offset.normalized()) < cos(deg_to_rad(49)):
		return false
	return game.clear_line(position, point, floor_index)

func remember(point: Vector2, which_floor: int) -> void:
	memory = point
	memory_floor = which_floor
	search_time = 7.0
	repath = 0

func move_guard(dt: float) -> void:
	var player: VIPActor = game.player
	var visible_player := sees(player.position, player.floor_index, 95.0 if player.covered else 155.0 if player.crouched else 255.0)
	var illegal: bool = game.trespassing() or game.attack_active or player.action_time > 0 or recognized
	if visible_player and illegal:
		lost_time = 0
		remember(player.position, player.floor_index)
		suspicion = minf(1, suspicion + dt * (1.3 if position.distance_to(player.position) < 90 else 0.62))
		if suspicion >= 1:
			if not recognized:
				game.sound("alert", -12)
				game.message("신원 발각 · 시야를 끊고 다른 길로 빠져나가세요", 3)
				game.detections += 1
				recognized = true
			state = "chase"
		elif state == "patrol":
			state = "suspicious"
	else:
		lost_time += dt
		suspicion = maxf(0, suspicion - dt * 0.25)
		if state == "suspicious" or (state == "chase" and lost_time >= 1.4):
			state = "search"
	for actor in game.actors:
		if actor.down and actor != self and not spotted_bodies.has(actor.get_instance_id()) and sees(actor.position, actor.floor_index, 140):
			spotted_bodies[actor.get_instance_id()] = true
			if state != "chase":
				state = "search"
				remember(actor.position, actor.floor_index)
				game.message("경비가 쓰러진 사람을 발견 · 마지막 위치를 수색 중", 3)
				game.body_discoveries += 1
	var destination := position
	if state == "patrol":
		if floor_index != home_floor:
			destination = game.stair_point
			if position.distance_to(game.stair_point) < 20 and stair_cooldown <= 0:
				set_floor(home_floor)
				position = game.stair_point + Vector2(-27,0)
				stair_cooldown = 1.2
		elif not patrol.is_empty():
			destination = patrol[waypoint]
			if position.distance_to(destination) < 14:
				waypoint = (waypoint + 1) % patrol.size()
				destination = patrol[waypoint]
				repath = 0
	elif state in ["search", "suspicious", "chase"]:
		search_time -= dt
		destination = game.stair_point if memory_floor != floor_index else memory
		if memory_floor != floor_index and position.distance_to(game.stair_point) < 20 and stair_cooldown <= 0:
			set_floor(memory_floor)
			position = game.stair_point + Vector2(-27, 0)
			stair_cooldown = 1.2
			destination = memory
		if search_time <= 0 and state != "chase":
			state = "patrol"
			suspicion = 0
			recognized = false
	repath -= dt
	if repath <= 0:
		path = game.find_path(position, destination, floor_index)
		repath = 0.4
	while not path.is_empty() and position.distance_to(path[0]) < 8:
		path.remove_at(0)
	velocity = Vector2.ZERO
	if not path.is_empty():
		var direction := position.direction_to(path[0])
		face = direction
		velocity = direction * (125 if state == "chase" else 70 if state == "search" else 49)
	game.open_guard_door(self)
	move_and_slide()
	if state == "chase" and visible_player and position.distance_to(player.position) < 32 and hit_cooldown <= 0:
		strike_time += dt
		if strike_time >= 0.55:
			strike_time = 0
			hit_cooldown = 1.3
			game.hurt()
	else:
		strike_time = 0
	update_cone()

func update_cone() -> void:
	cone = PackedVector2Array([Vector2.ZERO])
	for i in range(29):
		var angle := face.angle() + deg_to_rad(-49 + 98.0 * i / 28)
		var ray := Vector2.from_angle(angle) * 255
		var query := PhysicsRayQueryParameters2D.create(position, position + ray, 1 << floor_index)
		var hit := get_world_2d().direct_space_state.intersect_ray(query)
		cone.append((hit.position if not hit.is_empty() else position + ray) - position)

func incapacitate(lethal: bool) -> void:
	down = true
	dead = lethal
	state = "dead" if lethal else "unconscious"
	action_anim = "stabbed" if lethal else "choked"
	action_time = 0.8
	game.fx("hit", position)

func visual() -> void:
	if sprite == null:
		return
	var animation := "idle"
	if down:
		animation = action_anim if action_time > 0 else "death"
	elif action_time > 0:
		animation = action_anim
	elif velocity.length() > 1:
		animation = "sneak" if crouched and body == "hero" else "run" if velocity.length() > 170 else "walk"
	elif crouched:
		animation = "crouch"
	var direction := posmod(roundi(face.angle() / (PI / 4)), 8)
	var key := "%s_%d" % [animation, direction]
	if not sprite.sprite_frames.has_animation(key):
		animation = "idle"
		key = "idle_%d" % direction
	if sprite.animation != key:
		sprite.play(key)
		if animation == "death":
			sprite.frame = sprite.sprite_frames.get_frame_count(key) - 1
			sprite.pause()
	var data: Dictionary = VIPAssets.meta.bodies[body]
	var size := float(data.scales.get(animation, 1)) * 0.9
	var ground := float(data.grounds.get(animation, VIPAssets.meta.groundY))
	sprite.scale = Vector2.ONE * size
	sprite.position = Vector2(-32 * size, -ground * size + 8)
	z_index = 5 + int(position.y)

func _draw() -> void:
	if role == "guard" and not down and cone.size() >= 3:
		var tint := Color("b9c7d5")
		if state == "chase":
			tint = Color("ed6d64")
		elif state != "patrol":
			tint = Color("e6b876")
		draw_colored_polygon(cone, Color(tint, 0.12 if state == "patrol" else 0.20))
		draw_polyline(cone, Color(tint, 0.48), 1.1, true)
		if suspicion > 0:
			draw_arc(Vector2(0, -45), 10, -PI / 2, -PI / 2 + TAU * suspicion, 24, tint, 3, true)
		if strike_time > 0:
			draw_arc(Vector2.ZERO, 27, -PI/2, -PI/2+TAU*strike_time/0.55, 32, Color("ed6d64"), 3, true)
	if role == "player":
		draw_arc(Vector2(0, 3), 15, 0, TAU, 28, Color("88b8b4") if not covered else Color("e8c89b"), 1.5, true)
	if role == "target" and not dead:
		var diamond := PackedVector2Array([Vector2(0,-59),Vector2(5,-54),Vector2(0,-49),Vector2(-5,-54)])
		draw_colored_polygon(diamond, Color("ecbfa8"))

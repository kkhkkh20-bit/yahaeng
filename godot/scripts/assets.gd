class_name VIPAssets
extends RefCounted
## Original sprite sheets and palette material shared between instances.
static var meta: Dictionary
static var frames_cache: Dictionary = {}
static var atlas: Texture2D
static var tiles: Dictionary
static var tile_cache: Dictionary = {}
static var palette_shader: Shader

static func boot() -> void:
	meta = JSON.parse_string(FileAccess.get_file_as_string("res://assets/actors.json"))
	tiles = JSON.parse_string(FileAccess.get_file_as_string("res://assets/city_frames.json"))
	atlas = load("res://assets/city.png")
	palette_shader = load("res://scripts/palette.gdshader")

static func tile(key: String) -> Texture2D:
	if not tile_cache.has(key):
		var r: Array = tiles[key]
		var texture := AtlasTexture.new()
		texture.atlas = atlas
		texture.region = Rect2(r[0], r[1], r[2], r[3])
		tile_cache[key] = texture
	return tile_cache[key]

static func actor_frames(body: String) -> SpriteFrames:
	if frames_cache.has(body):
		return frames_cache[body]
	var frames := SpriteFrames.new()
	frames.remove_animation("default")
	for animation in meta.bodies[body].anims:
		var path := "res://assets/actors/%s/%s.png" % [body, animation]
		if not ResourceLoader.exists(path):
			continue
		var sheet: Texture2D = load(path)
		var count := int(meta.bodies[body].anims[animation][1])
		for direction in range(8):
			var key := "%s_%d" % [animation, direction]
			frames.add_animation(key)
			frames.set_animation_speed(key, 9 if animation in ["walk", "sneak"] else 12 if animation in ["run", "stab", "stabbed", "choke", "choked"] else 2)
			frames.set_animation_loop(key, animation not in ["death", "stab", "stabbed", "choke", "choked"])
			for index in range(count):
				var texture := AtlasTexture.new()
				texture.atlas = sheet
				texture.region = Rect2(index * 64, direction * 64, 64, 64)
				frames.add_frame(key, texture)
	frames_cache[body] = frames
	return frames

static func material(kind: String) -> ShaderMaterial:
	var palettes := {
		"player": ["e6b38a", "141414", "363731", "31352e", "161a1e"],
		"guard": ["ddaa80", "3a2a1c", "56603c", "3e3a2c", "2a241c"],
		"target": ["efc49e", "2b2b2b", "343b46", "252b33", "17191d"],
		"uniform": ["ddaa80", "141414", "56603c", "3e3a2c", "2a241c"]}
	var result := ShaderMaterial.new()
	result.shader = palette_shader
	var colors: Array = palettes[kind]
	for i in range(5):
		result.set_shader_parameter("ink%d" % i, Color("#" + colors[i]))
	return result

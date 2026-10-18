extends Node2D
## Standalone offline RTS and HTTP client for the shared Node LAN host.
const WIDTH = 40
const HEIGHT = 24
const CELL = 22
const TOP = 140
var game: Dictionary
var selected: Array = []
var player := 0
var elapsed := 0.0
var network_elapsed := 0.0
var token := ""
var sequence := 0
var pending: Array = []
var request_kind := ""
var message := ""
var host: LineEdit
var code: LineEdit
var status: Label
var http: HTTPRequest
var font: Font = ThemeDB.fallback_font

## Initialize UI, fresh game and one serialized HTTP transport.
func _ready() -> void:
	reset_game()
	if "--smoke" in OS.get_cmdline_user_args():
		smoke_test()
		return
	var bar := HBoxContainer.new()
	bar.position = Vector2(12, 12)
	add_child(bar)
	add_button(bar, "Offline / reset", offline)
	host = LineEdit.new()
	host.text = "http://127.0.0.1:8080"
	host.custom_minimum_size.x = 240
	bar.add_child(host)
	code = LineEdit.new()
	code.text = "glyph"
	code.custom_minimum_size.x = 100
	bar.add_child(code)
	add_button(bar, "Join LAN", join_lan)
	var actions := HBoxContainer.new()
	actions.position = Vector2(12, 55)
	add_child(actions)
	add_button(actions, "Worker 30 [W]", func(): issue({"type":"train", "kind":"worker"}))
	add_button(actions, "Soldier 40 [S]", func(): issue({"type":"train", "kind":"soldier"}))
	add_button(actions, "Army [A]", select_army)
	status = Label.new()
	status.position = Vector2(12, 100)
	add_child(status)
	http = HTTPRequest.new()
	http.timeout = 3.0
	add_child(http)
	http.request_completed.connect(response)

## Small UI helper; callbacks remain in ordinary game functions.
func add_button(parent: Node, text: String, action: Callable) -> void:
	var button := Button.new()
	button.text = text
	button.pressed.connect(action)
	parent.add_child(button)

## Full reset uses JSON-compatible dictionaries to match LAN snapshots.
func reset_game() -> void:
	game = {"tick":0, "next":1, "credits":[100,100], "winner":null, "units":[], "walls":[], "ore":[]}
	for y in range(3, HEIGHT - 3):
		if y not in [10,11,12]:
			game.walls.append("20,%d" % y)
	for cell in [Vector2i(7,7),Vector2i(7,16),Vector2i(32,7),Vector2i(32,16)]:
		game.ore.append({"x":cell.x,"y":cell.y,"amount":500})
	for p in range(2):
		spawn(p,"hq",36 if p else 3,12)
		spawn(p,"worker",34 if p else 5,11)
		spawn(p,"soldier",34 if p else 5,13)
	selected.clear()

## Allocate stable IDs; HQs have more health and cannot move.
func spawn(p: int, kind: String, x: int, y: int) -> void:
	game.units.append({"id":game.next,"p":p,"kind":kind,"x":x,"y":y,"hp":180 if kind=="hq" else (35 if kind=="worker" else 60),"order":null,"cool":0})
	game.next += 1

## Legal map test shared by order validation and BFS.
func legal(x: int, y: int) -> bool:
	return x>=0 and x<WIDTH and y>=0 and y<HEIGHT and ("%d,%d" % [x,y]) not in game.walls

## Breadth-first path search returns only the next movement cell.
func next_cell(u: Dictionary, tx: int, ty: int) -> Vector2i:
	var start := Vector2i(u.x,u.y)
	var target := Vector2i(tx,ty)
	var frontier: Array = [start]
	var first: Dictionary = {start:start}
	var index := 0
	while index<frontier.size():
		var cell: Vector2i = frontier[index]
		index += 1
		if cell==target:
			return first[cell]
		for delta in [Vector2i.RIGHT,Vector2i.DOWN,Vector2i.LEFT,Vector2i.UP]:
			var n: Vector2i = cell + delta
			if legal(n.x,n.y) and not first.has(n):
				first[n] = n if cell==start else first[cell]
				frontier.append(n)
	return start

## Validate local purchases and ownership. LAN validation happens on the host.
func apply_order(p: int, c: Dictionary) -> bool:
	if game.winner != null:
		return false
	if c.type=="train":
		var cost := 30 if c.kind=="worker" else 40
		var army: Array = game.units.filter(func(u): return u.p==p)
		var hqs: Array = army.filter(func(u): return u.kind=="hq")
		if c.kind not in ["worker","soldier"] or army.size()>=60 or hqs.is_empty() or game.credits[p]<cost:
			return false
		game.credits[p] -= cost
		spawn(p,c.kind,hqs[0].x+(-1 if p else 1),hqs[0].y)
		return true
	if not legal(c.x,c.y):
		return false
	var applied := false
	for u in game.units:
		if u.p==p and u.kind!="hq" and u.id in c.ids:
			u.order = {"type":c.type,"x":c.x,"y":c.y}
			applied = true
	return applied

## Distance metric on our four-neighbor tile map.
func distance(a: Dictionary, b: Dictionary) -> int:
	return absi(a.x-b.x)+absi(a.y-b.y)

## Fixed simulation tick with simultaneous damage, harvesting and victory.
func tick() -> void:
	if game.winner != null:
		return
	game.tick += 1
	var damage: Dictionary = {}
	for u in game.units:
		u.cool = maxi(0,u.cool-1)
		if u.kind=="hq":
			continue
		var enemies: Array = game.units.filter(func(v): return v.p!=u.p and distance(u,v)<=(3 if u.kind=="soldier" else 1))
		if not enemies.is_empty() and u.cool==0:
			var id: int = enemies[0].id
			damage[id] = damage.get(id,0)+(9 if u.kind=="soldier" else 2)
			u.cool = 5
			continue
		if game.tick%3!=0 or u.order==null:
			continue
		var o: Dictionary = u.order
		if o.type=="gather" and u.kind=="worker" and distance(u,o)<=1:
			for ore in game.ore:
				if ore.x==o.x and ore.y==o.y and ore.amount>0:
					ore.amount-=1
					game.credits[u.p]+=1
			continue
		if distance(u,o)==0:
			u.order=null
			continue
		var n := next_cell(u,o.x,o.y)
		u.x=n.x
		u.y=n.y
	for u in game.units:
		u.hp-=damage.get(u.id,0)
	game.units=game.units.filter(func(u): return u.hp>0)
	var alive: Array = [false,false]
	for u in game.units:
		if u.kind=="hq":
			alive[u.p]=true
	if not alive[0] or not alive[1]:
		game.winner=0 if alive[0] else (1 if alive[1] else 2)

## Simple offline enemy chooses ore for workers and our HQ for soldiers.
func bot() -> void:
	if game.tick%20!=0:
		return
	apply_order(1,{"type":"train","kind":"soldier"})
	var targets: Array = game.units.filter(func(u): return u.p==0 and u.kind=="hq")
	if targets.is_empty():
		return
	for u in game.units:
		if u.p!=1 or u.kind=="hq":
			continue
		var target: Dictionary = targets[0]
		var action := "attack"
		if u.kind=="worker":
			var ores: Array = game.ore.filter(func(r): return r.amount>0)
			ores.sort_custom(func(a,b): return distance(u,a)<distance(u,b))
			if not ores.is_empty():
				target=ores[0]
				action="gather"
		apply_order(1,{"type":action,"ids":[u.id],"x":target.x,"y":target.y})

## Offline dispatch is direct; LAN commands use a bounded serialized queue.
func issue(c: Dictionary) -> void:
	if token.is_empty():
		apply_order(player,c)
	elif pending.size()<32:
		pending.append(c)

## Select only local soldiers, including newly trained units.
func select_army() -> void:
	selected=game.units.filter(func(u): return u.p==player and u.kind=="soldier").map(func(u): return u.id)

## Explicit leave frees the remote slot, then resets local state.
func offline() -> void:
	if not request_kind.is_empty():
		message="Wait for the pending network request."
		return
	if not token.is_empty():
		send_request("leave", {"token":token})
	token=""
	player=0
	pending.clear()
	reset_game()

## Connect using the browser/Python protocol; Godot ENet is a different protocol.
func join_lan() -> void:
	if not request_kind.is_empty() or not token.is_empty():
		message="Return to offline before joining another match."
		return
	send_request("join", {"code":code.text})

## Exactly one HTTP request in flight prevents command sequence reordering.
func send_request(kind: String, data: Dictionary) -> void:
	request_kind=kind
	var error := http.request(host.text.trim_suffix("/")+"/"+kind,["Content-Type: application/json"],HTTPClient.METHOD_POST,JSON.stringify(data))
	if error!=OK:
		request_kind=""
		message="Could not start network request."

## Validate response shape and update only host-owned state in LAN mode.
func response(result: int, status_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	var kind := request_kind
	request_kind=""
	var data = JSON.parse_string(body.get_string_from_utf8())
	if result!=HTTPRequest.RESULT_SUCCESS or status_code!=200 or not data is Dictionary:
		message="Network error %d. Return offline and rejoin." % status_code
		if kind=="command":
			pending.clear()
		return
	message=""
	if kind=="join":
		token=data.token
		player=int(data.player)
		sequence=0
	elif kind=="state":
		game=data.game
	elif kind=="command":
		sequence=int(data.seq)

## Fixed 10 Hz offline loop or 10 Hz serialized LAN polling; draw at frame rate.
func _process(delta: float) -> void:
	if status==null:
		return
	if token.is_empty():
		elapsed=minf(elapsed+delta,0.5)
		while elapsed>=0.1:
			bot()
			tick()
			elapsed-=0.1
	else:
		network_elapsed+=delta
		if request_kind.is_empty() and network_elapsed>=0.1:
			network_elapsed=0
			if pending.is_empty():
				send_request("state",{"token":token})
			else:
				send_request("command",{"token":token,"seq":sequence+1,"command":pending.pop_front()})
	status.text=message if not message.is_empty() else "%s | Player %d | Credits %d | Tick %d | Winner %s" % ["Offline" if token.is_empty() else "LAN",player+1,game.credits[player],game.tick,str(game.winner)]
	queue_redraw()

## Desktop selection and contextual orders; UI fields consume keyboard input.
func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode==KEY_W:
			issue({"type":"train","kind":"worker"})
		elif event.keycode==KEY_S:
			issue({"type":"train","kind":"soldier"})
		elif event.keycode==KEY_A:
			select_army()
	if event is InputEventMouseButton and event.pressed and event.position.y>=TOP:
		var x := int(event.position.x/CELL)
		var y := int((event.position.y-TOP)/CELL)
		if event.button_index==MOUSE_BUTTON_LEFT:
			if not event.shift_pressed:
				selected.clear()
			for u in game.units:
				if u.p==player and u.kind!="hq" and u.x==x and u.y==y:
					selected.append(u.id)
					break
		elif event.button_index==MOUSE_BUTTON_RIGHT:
			var gather: bool = game.ore.any(func(r): return r.x==x and r.y==y and r.amount>0)
			issue({"type":"gather" if gather else "attack","ids":selected.duplicate(),"x":x,"y":y})

## Render text from the engine fallback font; external font assets are optional.
func glyph(x: int,y: int,text: String,color: Color) -> void:
	draw_string(font,Vector2(x*CELL+4,TOP+y*CELL+18),text,HORIZONTAL_ALIGNMENT_LEFT,-1,20,color)

## Full-map ASCII scene; this prototype intentionally has no fog of war.
func _draw() -> void:
	if game.is_empty():
		return
	draw_rect(Rect2(0,TOP,WIDTH*CELL,HEIGHT*CELL),Color("0b1220"))
	for y in range(HEIGHT):
		for x in range(WIDTH):
			glyph(x,y,".",Color("203348"))
	for wall in game.walls:
		var coords: PackedStringArray=wall.split(",")
		glyph(int(coords[0]),int(coords[1]),"#",Color.SLATE_GRAY)
	for ore in game.ore:
		if ore.amount>0:
			glyph(ore.x,ore.y,"$",Color.GOLD)
	for u in game.units:
		glyph(u.x,u.y,{"hq":"H","worker":"w","soldier":"s"}[u.kind],Color.CORAL if u.p else Color.SKY_BLUE)
		if u.id in selected:
			draw_rect(Rect2(u.x*CELL,TOP+u.y*CELL,CELL,CELL),Color.GOLD,false)

## Headless regression covers real movement, economy, invalid orders and combat.
func smoke_test() -> void:
	var id: int=game.units[1].id
	assert(apply_order(0,{"type":"gather","ids":[id],"x":7,"y":7}))
	for i in range(60):
		tick()
	assert(game.credits[0]>100)
	assert(not apply_order(0,{"type":"train","kind":"dragon"}))
	assert(not apply_order(0,{"type":"move","ids":[id],"x":-1,"y":0}))
	reset_game()
	game.units=[game.units[0],game.units[3],game.units[2]]
	game.units[2].x=35
	game.units[2].y=12
	game.units[1].hp=9
	tick()
	assert(game.winner==0)
	print("Godot smoke: movement, harvest, validation and victory passed")
	get_tree().quit()

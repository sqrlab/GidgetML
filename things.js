// Constructor for a thing, takes a name and a set of additional functions from the parser.
GIDGET.Thing = function(world, name, row, col, color, tags, actions) {

	this.name = name;		// The name by which the thing can be referred
	this.row = row;			// The row of the thing
	this.column = col;		// The column of the thing
	this.energy = 100;		// The current energy of the thing; things with energy < 0 are "dead"
	this.level = 1;			// The current level of the object above the grid, for creating boundaries
	this.labeled = true;	// Determines whether the label of the thing is shown
	this.speed = 1;
	this.color = color;
	this.tags = {};
	this.code = "";
	
	this.setEnergy = function(energy) { this.energy = energy; };
	this.setLevel = function(level) { this.level = level; };
	this.setCode = function(code) { this.code = code; }
	this.setSpeed = function(speed) { this.speed = speed; }
	this.setLabeled = function(labeled) { this.labeled = labeled; }
	
	// Translate the list of tags into a set (well, an object literal hash table of tag keys with true values).
	var i;
	for(i = 0; i < tags.length; i++)
		this.tags[tags[i]] = true;
	
	this.actions = actions;

	this.draw = function(ctx, size) {

		ctx.save();

		var padding = 2;

		// Draw shadow
		if(this.level > 1) {
		
			var offset = (this.level - 1) * 10;
			ctx.fillStyle = "rgba(0,0,0,.2)";
			ctx.fillRect(this.column * size + 1 + offset + padding, this.row * size + 1 + offset + padding, size - padding * 2, size - padding * 2);
		
		}		
		
		var image = GIDGET.ui.getImage(this.name, this.runtime.state);
		if(!isDef(image)) image = GIDGET.ui.getImage('unknown', 'default');

		var animateRowOffset = 0, animateColumnOffset = 0;
		if(GIDGET.ui.percentRemaining > 0) {
		
			if(this.rowDelta !== 0) animateRowOffset = -(GIDGET.ui.percentRemaining / 100.0) * size * this.rowDelta;
			if(this.columnDelta !== 0) animateColumnOffset = -(GIDGET.ui.percentRemaining / 100.0) * size * this.columnDelta;
		
		}

		if(isDef(image) && image.width > 0 && image.height > 0) {
			ctx.drawImage(image, this.column * size + padding + animateColumnOffset, this.row * size + padding + animateRowOffset, size - padding * 2, size - padding * 2);
		}
		else {			
			ctx.fillStyle = this.color;		
			ctx.fillRect(this.column * size + padding + animateColumnOffset, this.row * size + padding + animateRowOffset, size - padding * 2, size - padding * 2);
		}
		
		ctx.restore();
	
	}

	world.addThing(this);		
	
	// Give the thing a runtime.
	this.runtime = new GIDGET.Runtime(this, world);

}

GIDGET.Action = function(arguments, script) {

	return {
		arguments: arguments,
		script: script
	};

};

GIDGET.World = function(rowCount, colCount, gidgetRow, gidgetCol, code, mission) {

	// Remember the initial code
	this.code = code;

	// Remember the mission so it can be placed in the UI.	
	this.mission = isDef(mission) ? mission : "I don't know what I'm supposed to do here. No one gave me a mission :(";

	// Remember the goal
	this.goals = [];

	// All of the things in the world, starting with a Gidget
	this.things = [];

	// An array of arrays of arrays, representing a 2D grid where each cell contains a list of references to things.
	// This creates an empty grid.
	this.grid = new Array(rowCount);
	var row, col;
	for(row = 0; row < rowCount; row++) {
		this.grid[row] = new Array(colCount);
		for(col = 0; col < colCount; col++) {
			this.grid[row][col] = [];
		}
	}

	this.addGoal = function(goal) {
	
		this.goals.push(goal);
	
	};

	this.addThing = function(thing) {
		
		this.things.push(thing);
		this.place(thing, thing.row, thing.column);
	
	};
	
	this.removeThing = function(thing) {
	
		var index = $.inArray(thing, this.things);
		if(index >= 0) {
		
			// Remove from thing list
			this.things.splice(index, 1);
			
			// Remove from grid
			index = $.inArray(thing, this.grid[thing.row][thing.column]);
			if(index >= 0) {
				this.grid[thing.row][thing.column].splice(index, 1);
			}
			else {
				console.error("We shouldn't be able to remove thing from thing list but not grid");
			}

			// Remove from scanned
			index = $.inArray(thing, this.gidget.runtime.scanned);
			if(index >= 0) this.gidget.runtime.scanned.splice(index, 1);

			// Remove from analyzed
			index = $.inArray(thing, this.gidget.runtime.analyzed);
			if(index >= 0) this.gidget.runtime.analyzed.splice(index, 1);

			// Remove from grabbed
			index = $.inArray(thing, this.gidget.runtime.grabbed);
			if(index >= 0) this.gidget.runtime.grabbed.splice(index, 1);
			
		}
		else {
			console.error("It shouldn't be possible to remove something that isn't in this world.");
		}
		
	};

	this.resetThingDeltas = function() {
	
		for(var i = 0; i < this.things.length; i++) {
			this.things[i].rowDelta = 0;
			this.things[i].columnDelta = 0;
		}
	
	};

	// First, define how to place a thing.
	this.place = function(thing, row, col) {
	
		if(!this.isLegalColumn(row, col)) {
			console.error("" + row + " " + col + " isn't legal");
			return;
		}

		if(this.isLegalColumn(thing.row, thing.column)) {
				
			var index = this.grid[thing.row][thing.column].indexOf(thing);
			if(index >= 0)
				this.grid[thing.row][thing.column].splice(index, 1);
				
		}

		// Remember the most recent change.
		thing.rowDelta = row - thing.row;
		thing.columnDelta = col - thing.column;

		thing.row = row;
		thing.column = col;
		
		thing.energy -= 1;

		this.grid[thing.row][thing.column].push(thing);
	
	};
	
	// Define how to check legal positions.
	this.isLegalRow = function(row) { return row !== undefined && row >= 0 && row < this.grid.length; };
	this.isLegalColumn = function(row, col) { return this.isLegalRow(row) && col !== undefined && col >= 0 && col < this.grid[row].length; };

	// Add a bunch of ground things.
	for(row = 0; row < rowCount; row++) {
		for(col = 0; col < colCount; col++) {
		
			var ground = new GIDGET.Thing(this, "ground", row, col, "rgb(164,77,30)", {}, {});
			ground.setLevel(0);
			ground.setLabeled(false);
			
		}
	}

	// Add gidget. Every world has a gidget in it.
	this.gidget = new GIDGET.Thing(this, "gidget", gidgetRow, gidgetCol, "rgb(50,50,50)", {}, {});
	
	// This is the function that causes each thing in the world to step one step, in order.
	// It takes the code passed to the world and assigns it to Gidget.
	this.start = function(gidgetScript) {
	
		// Prepare all of the other Things in the world for execution.
		var i;
		for(i = 0; i < this.things.length; i++) {
		
			if(this.things[i] !== this.gidget)
				this.things[i].runtime.start(this.things[i].code, false, {});
		
		}
	
		// This prepares gidget for execution.
		this.gidget.runtime.start(gidgetScript, false, {});
	
	};
	
	// The world is executing while Gidget is executing.
	this.isExecuting = function() {
	
		return isDef(this.gidget) && isDef(this.gidget.runtime) && isDef(this.gidget.runtime.steps) && this.gidget.runtime.isExecuting();
	
	};
	
	// Steps all objects in the world one step, gathering all of their decisions into a list of lists.
	// that the caller can use to execute each decision one at a time.	
	this.step = function() {

		var decisions = [];
	
		// Step each thing in the world once, executing the resulting decisions (unless gidget).
		var i, thing;
		for(i = 0; i < this.things.length; i++) {
		
			thing = this.things[i];
			
			var thingDecisions = thing.runtime.step();
			
			// Put the decisions in the table for the caller.
			if(isDef(thingDecisions))
				decisions.push(thingDecisions);
		
		}
	
		return decisions;
	
	};
	
};
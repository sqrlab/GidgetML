GIDGET.experiment = {

	condition: Math.round(Math.random()) < 1 ? "control" : "male",	// control, male, female
	
	bonusPerLevel: 0.15,
	
	isControl: function() {
	
		if (this.condition === "control")
			return true;
		
		return false;
	
	},
	
	isMale: function() {	
	
		if (this.condition === "male")
			return true;
		
		return false;
	
	},
	
	isFemale: function() {	
	
		if (this.condition === "female")
			return true;
		
		return false;
	
	},
	
	isExperimental: function() {
		
		if ((this.condition === "male") || (this.condition === "female"))
			return true;
		
		return false;
	
	},
	
	loadExpCondition: function() {
		
		// Set the current experimental state from localStorage
		this.condition = localStorage.getItem('expCondition').replace(/['"]/g,'');		
	},
	
	saveExpCondition: function() {
		
		// Save the current experimental state to localStorage
		localStorage.setObject('expCondition', this.condition);	
	},

};
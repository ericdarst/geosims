/**
GeoSIMS functions.js
$Revision: $
**/
dojo.require("dijit.dijit");
dojo.require("dojox.grid.DataGrid");
dojo.require("dojox.grid.cells.dijit");
dojo.require("dojo.parser");
dojo.require("dojo.data.ItemFileWriteStore");
dojo.require("dojox.data.QueryReadStore");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.layout.TabContainer");
dojo.require("dijit.layout.AccordionContainer");
dojo.require("dijit.TitlePane");
dojo.require("dijit.form.Form");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.form.Select");
dojo.require("dijit.form.FilteringSelect");
dojo.require("dijit.form.DropDownButton");
dojo.require("dijit.form.DateTextBox");
dojo.require("dijit.form.SimpleTextarea");
dojo.require("dijit.Menu");
dojo.require("dijit.Dialog");
dojo.require("dijit.TooltipDialog");

panes = {};

function init() {
	tabs = dijit.byId("TabContainer");
	dojo.connect(tabs,"selectChild",function(pane){
		//console.log("selected",pane);
		if (pane.vars && pane.vars.isLoaded == false) {
			pane.vars.init(panes);
		}
	});
	store_empty = new dojo.data.ItemFileWriteStore({data:{items:[]}});
	
	panes.mainPane = dijit.byId("MainPane");
	panes.mainPane.vars = {};
	panes.mainPane.vars.isLoaded = false;
	panes.mainPane.vars.init = function(panes) { buildPane_main(panes.mainPane) };
	panes.facPane = dijit.byId("FacilityPane");
	panes.facPane.vars = {};
	panes.facPane.vars.isLoaded = false;
	panes.facPane.vars.init = function(panes) { buildPane_fac(panes.facPane) };
	panes.roomPane = dijit.byId("RoomPane");
	panes.roomPane.vars = {};
	panes.roomPane.vars.isLoaded = false;
	panes.roomPane.vars.init = function(panes) { buildPane_room(panes.roomPane) };
	
	panes.mainPane.vars.init(panes);
}

function buildPane_main(pane) {
	//console.log(pane);
	pane.grids = {};
	
	//------blgErrorsByTableByType------
	var blgErrorsByTableByTypeContainer = dojo.create("div",{"class":"reportContainer floatLeft",'innerHTML':'<div class="gridTitle">Summary of Errors By Table And Type<br/><span id="blgErrorsByTableByType_count" class="gridCount"></span><br/><span id="blgErrorsByTableByType_timestamp" class="gridTimestamp"></span><span id="blgErrorsByTableByType_reload"></span></div>'},pane.domNode);
	pane.grids.grid_blgErrorsByTableByType = new dojox.grid.DataGrid({
		store: null,
		structure: getGridLayout_blgErrorsByTableByType(pane),
		autoWidth: true,
		pane: pane
	}, dojo.create("div"));
	var gridContainer = dojo.create("div",{"id":"grid_blgErrorsByTableByType","class":"gridContainer"},blgErrorsByTableByTypeContainer);
	gridContainer.appendChild(pane.grids.grid_blgErrorsByTableByType.domNode);
	pane.grids.grid_blgErrorsByTableByType.startup();
	pane.grids.grid_blgErrorsByTableByType.evt = {}; //Object to hold dojo.connect handlers
	pane.grids.grid_blgErrorsByTableByType.getData = function() {
		var grid = pane.grids.grid_blgErrorsByTableByType;
		grid.setStore(store_empty);
  	var deferred = submitQuery(dojo.toJson(['blgErrorsByTableByType']),"php/getErrors.php");
    deferred.addCallback(function(data) { //callback for RA info query
    	//console.log(data);
    	if (data.msg) {
    		postClientMessage({
    			text:data.msg.text,
    			type:data.msg.type
    		});
    		if (data.msg.type == 'failure') {
    			return;
    		}
    	}
    	if (grid) {
      	var store = new dojo.data.ItemFileWriteStore({
      		data: {
      			items: data.results.blgErrorsByTableByType
      		}
      	});
      	store.fetch({
    			onComplete: function(items,request) {
    				var count_total = 0;
    				for (var i=0; i<items.length; i++) {
    					var item = items[i];
    					count_total += store.getValue(item,'COUNT') * 1;
    				}
    				dojo.byId("blgErrorsByTableByType_count").innerHTML = ' (' + data.results.blgErrorsByTableByType.length + ' error categories found, ' + count_total + ' errors in total)';
    				dojo.byId("blgErrorsByTableByType_timestamp").innerHTML = dojo.date.locale.format(new Date(), {selector: "date", datePattern:'EEEE, MMMM d yyyy, h:mm a'});
    			}
    		});
      	grid.noDataMessage = 'No errors.';
      	grid.selection.clear();
      	grid.setStore(store);
      }
    });
	}
	new dijit.form.Button({
  	label: "Reload",
  	"class":"queryButton",
  	onClick: function() {
  		pane.grids.grid_blgErrorsByTableByType.getData();
  	}
  }).placeAt('blgErrorsByTableByType_reload');
	
	//------blgErrorsByFac------
	var blgErrorsByFacContainer = dojo.create("div",{"class":"reportContainer floatLeft",'innerHTML':'<div class="gridTitle">Summary of Errors By Facility<br/><span id="blgErrorsByFac_count" class="gridCount"></span></br><span id="blgErrorsByFac_timestamp" class="gridTimestamp"></span><span id="blgErrorsByFac_reload"></span></div>'},pane.domNode);
	pane.grids.grid_blgErrorsByFac = new dojox.grid.DataGrid({
		store: null,
		structure: getGridLayout_blgErrorsByFac(pane),
		autoWidth: true,
		pane: pane
	}, dojo.create("div"));
	var gridContainer = dojo.create("div",{"id":"grid_blgErrorsByFac","class":"gridContainer"},blgErrorsByFacContainer);
	gridContainer.appendChild(pane.grids.grid_blgErrorsByFac.domNode);
	pane.grids.grid_blgErrorsByFac.startup();
	pane.grids.grid_blgErrorsByFac.evt = {}; //Object to hold dojo.connect handlers
	pane.grids.grid_blgErrorsByFac.getData = function() {
	  var grid = pane.grids.grid_blgErrorsByFac
    grid.setStore(store_empty);
  	var deferred = submitQuery(dojo.toJson(['blgErrorsByFac']),"php/getErrors.php");
    deferred.addCallback(function(data) { //callback for RA info query
    	//console.log(data);
    	if (data.msg) {
    		postClientMessage({
    			text:data.msg.text,
    			type:data.msg.type
    		});
    		if (data.msg.type == 'failure') {
    			return;
    		}
    	}
    	if (grid) {
      	var store = new dojo.data.ItemFileWriteStore({
      		data: {
      			items: data.results.blgErrorsByFac
      		}
      	});
      	dojo.byId("blgErrorsByFac_count").innerHTML = ' (' + data.results.blgErrorsByFac.length + ' facilities found)';
      	dojo.byId("blgErrorsByFac_timestamp").innerHTML = dojo.date.locale.format(new Date(), {selector: "date", datePattern:'EEEE, MMMM d yyyy, h:mm a'});
      	grid.noDataMessage = 'No errors.';
      	grid.selection.clear();
      	grid.setStore(store);
      }
    });
  }
  new dijit.form.Button({
  	label: "Reload",
  	"class":"queryButton",
  	onClick: function() {
  		pane.grids.grid_blgErrorsByFac.getData();
  	}
  }).placeAt('blgErrorsByFac_reload');
	
	//------blgChangesByTable------
	/**var blgChangesByTableContainer = dojo.create("div",{"class":"reportContainer floatLeft",'innerHTML':'<div class="gridTitle">Summary of Changes By DB User SIMSWEB By History Table<br/><span id="blgChangesByTable_timestamp" class="gridTimestamp"></span><span id="blgChangesByTable_reload"></span></div>'},pane.domNode);
	pane.grids.grid_blgChangesByTable = new dojox.grid.DataGrid({
		store: null,
		structure: getGridLayout_blgChangesByTable(pane),
		autoWidth: true,
		pane: pane
	}, dojo.create("div"));
	var gridContainer = dojo.create("div",{"id":"grid_blgChangesByTable","class":"gridContainer"},blgChangesByTableContainer);
	gridContainer.appendChild(pane.grids.grid_blgChangesByTable.domNode);
	pane.grids.grid_blgChangesByTable.startup();
	pane.grids.grid_blgChangesByTable.evt = {}; //Object to hold dojo.connect handlers
	pane.grids.grid_blgChangesByTable.getData = function() {
	  var grid = pane.grids.grid_blgChangesByTable
    grid.setStore(store_empty);
  	var deferred = submitQuery(dojo.toJson(['blgChangesByTable']),"php/getErrors.php");
    deferred.addCallback(function(data) { //callback for RA info query
    	//console.log(data);
    	if (data.msg) {
    		postClientMessage({
    			text:data.msg.text,
    			type:data.msg.type
    		});
    		if (data.msg.type == 'failure') {
    			return;
    		}
    	}
    	if (grid) {
      	var store = new dojo.data.ItemFileWriteStore({
      		data: {
      			items: data.results.blgChangesByTable
      		}
      	});
      	dojo.byId("blgChangesByTable_timestamp").innerHTML = dojo.date.locale.format(new Date(), {selector: "date", datePattern:'EEEE, MMMM d yyyy, h:mm a'});
      	grid.noDataMessage = 'No errors.';
      	grid.selection.clear();
      	grid.setStore(store);
      }
    });
  }
	new dijit.form.Button({
  	label: "Reload",
  	"class":"queryButton",
  	onClick: function() {
  		pane.grids.grid_blgChangesByTable.getData();
  	}
  }).placeAt('blgChangesByTable_reload');
	**/
	
	pane.vars.loadData = function() {
		pane.grids.grid_blgErrorsByTableByType.getData();
		pane.grids.grid_blgErrorsByFac.getData();
		//pane.grids.grid_blgChangesByTable.getData();
  }

	//"Reload All" button
  new dijit.form.Button({
  	label: "Reload All",
  	"class":"queryButton",
  	onClick: function() {
  		pane.vars.loadData();
  	}
  }).placeAt('MainPane-header','last');
  
  pane.vars.loadData(pane);
  pane.vars.isLoaded = true;
  return pane;
}

function buildPane_fac(pane) {
	//console.log(pane);
	pane.grids = {};
	
	var facErrorsContainer = dojo.create("div",{"class":"reportContainer floatLeft",'innerHTML':'<div class="gridTitle">FACILITY_TABLE Errors<br/><span id="facErrors_count" class="gridCount"></span><br/><span id="facErrors_timestamp" class="gridTimestamp"></span><span id="facErrors_reload"></span></div>'},pane.domNode);
	pane.grids.grid_facErrors = new dojox.grid.DataGrid({
		store: null,
		structure: getGridLayout_facErrors(pane),
		autoWidth: true,
		pane: pane
	}, dojo.create("div"));
	var gridContainer = dojo.create("div",{"id":"grid_facErrors","class":"gridContainer"},facErrorsContainer);
	gridContainer.appendChild(pane.grids.grid_facErrors.domNode);
	pane.grids.grid_facErrors.startup();
	pane.grids.grid_facErrors.evt = {}; //Object to hold dojo.connect handlers
	pane.grids.grid_facErrors.getData = function() {
		var grid = pane.grids.grid_facErrors;
		grid.setStore(store_empty);
  	var deferred = submitQuery(dojo.toJson(['facErrors']),"php/getErrors.php");
    deferred.addCallback(function(data) { //callback for RA info query
    	//console.log(data);
    	if (data.msg) {
    		postClientMessage({
    			text:data.msg.text,
    			type:data.msg.type
    		});
    		if (data.msg.type == 'failure') {
    			return;
    		}
    	}
    	if (grid) {
      	var store = new dojo.data.ItemFileWriteStore({
      		data: {
      			items: data.results.facErrors
      		}
      	});
      	dojo.byId("facErrors_count").innerHTML = ' (' + data.results.facErrors.length + ' facility errors found)';
      	dojo.byId("facErrors_timestamp").innerHTML = dojo.date.locale.format(new Date(), {selector: "date", datePattern:'EEEE, MMMM d yyyy, h:mm a'});
      	grid.noDataMessage = 'No errors.';
      	grid.selection.clear();
      	grid.setStore(store);
      }
    });
  }
  new dijit.form.Button({
  	label: "Reload",
  	"class":"queryButton",
  	onClick: function() {
  		pane.grids.grid_facErrors.getData();
  	}
  }).placeAt('facErrors_reload');
	
	var facStatusContainer = dojo.create("div",{"class":"reportContainer floatLeft",'innerHTML':'<div class="gridTitle">FACILITY_TABLE Status DP/UC/UR/INF<br/><span id="facStatus_count" class="gridCount"></span><br/><span id="facStatus_timestamp" class="gridTimestamp"></span><span id="facStatus_reload"></span></div>'},pane.domNode);
	pane.grids.grid_facStatus = new dojox.grid.DataGrid({
		store: null,
		structure: getGridLayout_facStatus(pane),
		autoWidth: true,
		pane: pane
	}, dojo.create("div"));
	var gridContainer = dojo.create("div",{"id":"grid_facStatus","class":"gridContainer"},facStatusContainer);
	gridContainer.appendChild(pane.grids.grid_facStatus.domNode);
	pane.grids.grid_facStatus.startup();
	pane.grids.grid_facStatus.evt = {}; //Object to hold dojo.connect handlers
	pane.grids.grid_facStatus.getData = function() {
		var grid = pane.grids.grid_facStatus;
		grid.setStore(store_empty);
  	var deferred = submitQuery(dojo.toJson(['facStatus']),"php/getErrors.php");
    deferred.addCallback(function(data) { //callback for RA info query
    	//console.log(data);
    	if (data.msg) {
    		postClientMessage({
    			text:data.msg.text,
    			type:data.msg.type
    		});
    		if (data.msg.type == 'failure') {
    			return;
    		}
    	}
    	if (grid) {
      	var store = new dojo.data.ItemFileWriteStore({
      		data: {
      			items: data.results.facStatus
      		}
      	});
      	dojo.byId("facStatus_count").innerHTML = ' (' + data.results.facStatus.length + ' facilities found)';
      	dojo.byId("facStatus_timestamp").innerHTML = dojo.date.locale.format(new Date(), {selector: "date", datePattern:'EEEE, MMMM d yyyy, h:mm a'});
      	grid.noDataMessage = 'No errors.';
      	grid.selection.clear();
      	grid.setStore(store);
      }
    });
  }
	new dijit.form.Button({
  	label: "Reload",
  	"class":"queryButton",
  	onClick: function() {
  		pane.grids.grid_facStatus.getData();
  	}
  }).placeAt('facStatus_reload');
	
	
	pane.vars.loadData = function() {
		pane.grids.grid_facErrors.getData();
    pane.grids.grid_facStatus.getData()
  }

  //"Reload All" button
  new dijit.form.Button({
  	label: "Reload All",
  	"class":"queryButton",
  	onClick: function() {
  		pane.vars.loadData();
  	}
  }).placeAt('FacilityPane-header','last');

  pane.vars.loadData(pane);  
  pane.vars.isLoaded = true;
  return pane;
}

function buildPane_room(pane) {
	console.log('room',pane);
	pane.grids = {};
	
	var roomErrorsContainer = dojo.create("div",{"class":"reportContainer",'innerHTML':'<div class="gridTitle">Room, Room Assignment, and Room Assignment Child Table Errors<br/><span id="roomErrors_count" class="gridCount"></span><br/><span id="roomErrors_timestamp" class="gridTimestamp"></span><span id="roomErrors_reload"></span></div>'},pane.domNode);
	pane.grids.grid_roomErrors = new dojox.grid.DataGrid({
		store: null,
		structure: getGridLayout_roomErrors(pane),
		pane: pane
	}, dojo.create("div"));
	var gridContainer = dojo.create("div",{"id":"grid_roomErrors","class":"gridContainer"},roomErrorsContainer);
	gridContainer.appendChild(pane.grids.grid_roomErrors.domNode);
	pane.grids.grid_roomErrors.startup();
	pane.grids.grid_roomErrors.evt = {}; //Object to hold dojo.connect handlers
	pane.grids.grid_roomErrors.getData = function() {
		var grid = pane.grids.grid_roomErrors;
		grid.setStore(store_empty);
  	var deferred = submitQuery(dojo.toJson(['roomErrors']),"php/getErrors.php");
    deferred.addCallback(function(data) { //callback for RA info query
    	//console.log(data);
    	if (data.msg) {
    		postClientMessage({
    			text:data.msg.text,
    			type:data.msg.type
    		});
    		if (data.msg.type == 'failure') {
    			return;
    		}
    	}
    	if (grid) {
      	var store = new dojo.data.ItemFileWriteStore({
      		data: {
      			items: data.results.roomErrors
      		}
      	});
      	dojo.byId("roomErrors_count").innerHTML = ' (' + data.results.roomErrors.length + ' room errors found)';
      	dojo.byId("roomErrors_timestamp").innerHTML = dojo.date.locale.format(new Date(), {selector: "date", datePattern:'EEEE, MMMM d yyyy, h:mm a'});
      	grid.noDataMessage = 'No errors.';
      	grid.selection.clear();
      	grid.setStore(store);
      }
    });
  }
  new dijit.form.Button({
  	label: "Reload",
  	"class":"queryButton",
  	onClick: function() {
  		pane.grids.grid_roomErrors.getData();
  	}
  }).placeAt('roomErrors_reload');
	
	pane.vars.loadData = function() {
		pane.grids.grid_roomErrors.getData();
	}
  
  //"Reload All" button
  new dijit.form.Button({
  	label: "Reload All",
  	"class":"queryButton",
  	onClick: function() {
  		pane.vars.loadData();
  	}
  }).placeAt('RoomPane-header','last');

  
  pane.vars.isLoaded = true;
  pane.vars.loadData(pane);
  return pane;
}

function getGridLayout_blgErrorsByTableByType(pane) {return [
		{
			onAfterRow: function(rowIndex, subRows, rowNode) {
				//console.log({'gridType': 'RAO', 'onAfter' : rowIndex, 'subRows' : subRows});
				dojo.parser.parse(rowNode);
			},
			cells:[
			{
				field : "TBL",
				name : "Table",
				editable : false,
				width : "18em"
			},{
				field : "SEVERITY",
				name : "Severity",
				editable : false,
				width : "5em"
			},{
				field : "ERROR_TYPE",
				name : "Error Type",
				editable : false,
				width : "30em"
			},{
				field : "COUNT",
				name : "Error Count",
				editable : false,
				width : "7em",
				formatter : formatterNumber
			}]
		}
	]
}

function getGridLayout_blgErrorsByFac(pane) {return [
		{
			onAfterRow: function(rowIndex, subRows, rowNode) {
				//console.log({'gridType': 'RAO', 'onAfter' : rowIndex, 'subRows' : subRows});
				dojo.parser.parse(rowNode);
			},
			cells:[
			{
				field : "facility_code",
				name : "Facility",
				editable : false,
				width : "17em"
			},{
				field : "COUNT",
				name : "Error Count",
				editable : false,
				width : "7em",
				formatter : formatterNumber
			}]
		}
	]
}

function getGridLayout_blgChangesByTable(pane) {return [
		{
			onAfterRow: function(rowIndex, subRows, rowNode) {
				//console.log({'gridType': 'RAO', 'onAfter' : rowIndex, 'subRows' : subRows});
				dojo.parser.parse(rowNode);
			},
			cells:[
			{
				field : "TIMEFRAME",
				name : "Timeframe",
				editable : false,
				width : "10em"
			},{
				field : "ROOM_CHANGES",
				name : "Room Changes",
				editable : false,
				width : "10em",
				formatter : formatterNumber
			},{
				field : "ROOM_ASSIGNMENT_CHANGES",
				name : "Room Assignment Changes",
				editable : false,
				width : "10em",
				formatter : formatterNumber
			},{
				field : "RA_USE_CHANGES",
				name : "Room Assignment Use Changes",
				editable : false,
				width : "10em",
				formatter : formatterNumber
			},{
				field : "RA_OCCUPANT_CHANGES",
				name : "Room Assignment Occupant Changes",
				editable : false,
				width : "10em",
				formatter : formatterNumber
			},{
				field : "ROOMS_VS_GRANTS_CHANGES",
				name : "Rooms Vs Grants Changes",
				editable : false,
				width : "10em",
				formatter : formatterNumber
			},{
				field : "TOTAL_CHANGES",
				name : "Total Changes",
				editable : false,
				width : "10em",
				formatter : formatterNumber
			}]
		}
	]
}

function getGridLayout_facErrors(pane) {return [
		{
			onAfterRow: function(rowIndex, subRows, rowNode) {
				//console.log({'gridType': 'RAO', 'onAfter' : rowIndex, 'subRows' : subRows});
				dojo.parser.parse(rowNode);
			},
			cells:[
			{
				field : "FACDESC",
				name : "Facility",
				editable : false,
				width : "25em"
			},{
				field : "TBL",
				name : "Table",
				editable : false,
				width : "14em"
			},{
				field : "SEVERITY",
				name : "Severity",
				editable : false,
				width : "5em"
			},{
				field : "ERROR_TYPE",
				name : "Error Type",
				editable : false,
				width : "10em"
			},{
				field : "ERROR",
				name : "Error Description",
				editable : false,
				width : "30em"
			}]
		}
	]
}

function getGridLayout_facStatus(pane) {return [
		{
			onAfterRow: function(rowIndex, subRows, rowNode) {
				//console.log({'gridType': 'RAO', 'onAfter' : rowIndex, 'subRows' : subRows});
				dojo.parser.parse(rowNode);
			},
			cells:[
			{
				field : "FACDESC",
				name : "Facility",
				editable : false,
				width : "25em"
			},{
				field : "STATUSDESC",
				name : "Table",
				editable : false,
				width : "12em"
			}]
		}
	]
}

function getGridLayout_roomErrors(pane) {return [
		{
			onAfterRow: function(rowIndex, subRows, rowNode) {
				//console.log({'gridType': 'RAO', 'onAfter' : rowIndex, 'subRows' : subRows});
				dojo.parser.parse(rowNode);
			},
			cells:[
			{
				field : "facility_code",
				name : "Facility Code",
				editable : false,
				width : "7em"
			},{
				field : "room_number",
				name : "Room Number",
				editable : false,
				width : "8em"
			},{
				field : "TBL",
				name : "Table",
				editable : false,
				width : "17em"
			},{
				field : "SEVERITY",
				name : "Severity",
				editable : false,
				width : "5em"
			},{
				field : "ERROR_TYPE",
				name : "Error Type",
				editable : false,
				width : "20em"
			},{
				field : "ERROR",
				name : "Error Description",
				editable : false,
				width : "auto"
			}]
		}
	]
}

function formatterNumber(val, rowIdx, cell) {
	cell.customClasses.push('alignRight');
	return val;
}

dojo.ready(init);

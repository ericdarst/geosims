dojo.require("dojo.parser");
dojo.require("dijit.dijit");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.layout.TabContainer");
dojo.require("dojox.grid.DataGrid");
dojo.require("dojo.data.ItemFileWriteStore");
dojo.require("dijit.form.Button");

var gridErr, gridFeat;

function init() {
	grid_store = new dojo.data.ItemFileWriteStore({url:"trackerItems.json"});

	grid_layout = [
		{
			field : "ID",
			name : "ID",
			width: "3em",
			formatter : function(val, rowIdx, cell) {
				cell.customClasses.push('bold');
				return '#' + val;
			}
		},{
			field : "STATUS",
			name : "Status",
			width : "6em",
			formatter : function(val, rowIdx, cell) {
						if (val == 'RESOLVED') {
  						var rowNode = cell.grid.getRowNode(rowIdx);
  						if (rowNode) {
  							//console.log(rowNode);
  							dojo.style(rowNode,"color","gray");
  						}
  					}
						return val;
			}
		},{
			field : "SEVERITY",
			name : "Severity",
			width : "6em",
			options: ["Critical","High","Medium","Low"],
			values: [0,1,2,3],
			formatter : function(val, rowIdx, cell) {
						var rowItem = cell.grid.getItem(rowIdx);
						if (rowItem) {
							var status = cell.grid.store.getValue(rowItem, "STATUS");
							if (status != 'RESOLVED') {
    			    	if (val == 0) {
        					cell.customClasses.push('sev-crit');
        				} else if (val == 1) {
        					cell.customClasses.push('sev-high');
        				} else if (val == 2) {
        					cell.customClasses.push('sev-med');
        				} else if (val == 3) {
        					cell.customClasses.push('sev-low');
        				}
        			}
        		}
    				var valIdx = dojo.indexOf(cell.values, val);
    				if (cell.options[valIdx]) {
    					var val = cell.options[valIdx];
    				}
    				return val;
    			}
		},{
			field : "O_DATE",
			name : "Date Reported",
			width : "5.5em"
		},{
			field : "C_DATE",
			name : "Date Closed",
			width : "5.5em"
		},{
			field : "REPORTED_BY",
			name : "Reported By",
			width : "6em"
		},{
			field : "TYPE",
			name : "Type",
			width: "5em"
		},{
			field : "DESCRIPTION",
			name : "Description",
			width : "auto"
		},{
			field : "RESOLUTION",
			name : "Resolution",
			width : "6em"
		}
	];
	
	gridErr = new dojox.grid.DataGrid({
		store: grid_store,
		structure: grid_layout,
		//rowSelector: "20px",
		autoWidth: false,
		autoHeight: false,
		sortInfo: 3,
		query: {"TYPE":"ERROR"}
		
	},
	"gridDiv_01");
	gridErr.startup();

	gridFeat = new dojox.grid.DataGrid({
		store: grid_store,
		structure: grid_layout,
		//rowSelector: "20px",
		autoWidth: false,
		autoHeight: false,
		sortInfo: 3,
		query: {"TYPE":"FEATURE"}
		
	},
	"gridDiv_02");
	gridFeat.startup();

}

function testfunc() {
	alert('testf');
}

dojo.addOnLoad(init);

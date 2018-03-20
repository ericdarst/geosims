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
dojo.require("dijit.form.ComboBox");
dojo.require("dijit.form.FilteringSelect");
dojo.require("dijit.form.DropDownButton");
dojo.require("dijit.form.DateTextBox");
dojo.require("dijit.form.SimpleTextarea");
dojo.require("dijit.Menu");
dojo.require("dijit.Dialog");
dojo.require("dijit.TooltipDialog");

var tabs, tabCount;
//var fields;
var authz, netid;

function init() {
	setCustomClasses(); //Set customized dojo classes
	getAuthz(makeAuthzButton("userwelcome"), false); //Get ASTRA authorizations and set authz button and dialog content

	store_empty = new dojo.data.ItemFileWriteStore({data:{items:[]}});

	helpTooltip = new CustomDynamicTooltip({
    connectId: [],
    label: "",
    definitions:dataDefinitions.columns,
    defClassAttr:"data-sims-helpClass",
    defValueAttr:"data-sims-helpValue"
  });
	tabs = dijit.byId("queryTabs");
	//makeFrontTab(tabs);
	makeAddQueryTab(tabs);
	newQueryTab(tabs);
}

function getSelectOptions(optionValues, selectedValue) {
	var options = [];
	for (field in optionValues) {
		options.push({label:optionValues[field].label,value:field,selected:(field == selectedValue)});
	}
	return options;
}

//Compile query parameters for submital to server. Strips out any extra properties, e.g. formElement
function compileQuery(whereGroup, fieldIndexes, organizedWhereGroup) {
	//loop through each whereItem in the whereGroup array. Some whereItems will be nested groups (by fieldIndex name), others will be individual conditions
	dojo.forEach(whereGroup, function(whereItem, i) {
		//console.log('compileQuery whereItem',whereItem);
		if (whereItem.item.length == 1) { //This is an individual condition
			var item = whereItem.item[0];
			//if (item.formElement) delete item.formElement; //remove the form element for submission to the server
			var fieldIndex = dojo.indexOf(fieldIndexes,item.field);
			if (fieldIndex !== -1) { //If the fieldIndex name exists already, add the 'OR' operator
				whereItem.operator = 'OR';
				var itemGroup = organizedWhereGroup[fieldIndex];
				var itemCopy = {item:[{field:itemGroup.item[0].field,predicate:itemGroup.item[0].predicate,value:itemGroup.item[0].value}]};
				var whereItemCopy = {item:[{field:whereItem.item[0].field,predicate:whereItem.item[0].predicate,value:whereItem.item[0].value}],operator:whereItem.operator};
				if (itemGroup.item.length == 1) {
					//console.log('whereItem0',itemCopy,whereItem, whereItemCopy);
					organizedWhereGroup[fieldIndex].item = [itemCopy,whereItemCopy];
				} else {
					//console.log('whereItem1',itemCopy,whereItem, whereItemCopy);
					organizedWhereGroup[fieldIndex].item.push(whereItemCopy);
				}
			} else {
				var fieldIndex = fieldIndexes.length;
				fieldIndexes.push(item.field);
				//console.log('whereItem2:',whereItem);
				var itemCopy = {item:[{field:whereItem.item[0].field,predicate:whereItem.item[0].predicate,value:whereItem.item[0].value}]};
				if (fieldIndex > 0) itemCopy.operator = 'AND';
				//organizedWhereGroup[fieldIndex] = whereItem;
				organizedWhereGroup[fieldIndex] = itemCopy;
			}
		} else if (whereItem.item.length > 1) {
			var returnArr = compileQuery(whereItem.item, fieldIndexes, organizedWhereGroup);
			fieldIndexes = returnArr[0];
			organizedWhereGroup = returnArr[1];
		}
	});
	return [fieldIndexes, organizedWhereGroup];
}

//Submit query params to server
function makeQuery(pane) {
	//console.log(pane);
	pane.vars.queryBoxForm.submit();
	var queryParams = {};
	queryParams.from = pane.vars.query.from;
	queryParams.where = compileQuery(pane.vars.query.where, [], [])[1];
	var queryDeferred = submitQuery(dojo.toJson(queryParams),"dataviewer/php/query.php");
	queryDeferred.addCallback(function(data) {
		if (data.msg) {
			postClientMessage({
				text:data.msg.text,
				type:data.msg.type
			});
		}
		setDirtyQuery(pane, false);
		pane.set("title",pane.vars.queryType + " Query (" + data.length + ")");

		if (queryParams.from == 'R') {
			var grid = pane.grids.grid_R;
			//Set gridRA container size if previous query was a Room Assignment Records query
			if (pane.vars.previousFrom == 'RA') {
  			var newContainerHeight = dojo.marginBox(pane.vars.layoutContainer_grids.domNode).h * .33; //Set gridRA container height to 33% of grids container height
  			pane.vars.layoutContainer_gridRA.resize({h: newContainerHeight});
  			pane.vars.layoutContainer_grids.layout();
  		}
			//Set grid stores to empty and clear selection
			pane.grids.grid_RA.selection.clear();
			pane.grids.grid_RA.setStore(store_empty);
			pane.grids.grid_RAB.selection.clear();
			pane.grids.grid_RAB.setStore(store_empty);
			pane.grids.grid_RAO.selection.clear();
			pane.grids.grid_RAO.setStore(store_empty);
			pane.grids.grid_RAU.selection.clear();
			pane.grids.grid_RAU.setStore(store_empty);
			//Show/hide columns
			grid.layout.setColumnVisibility(0,true);
			grid.layout.setColumnVisibility(2,true);
			pane.grids.grid_RA.layout.setColumnVisibility(1,false);
			pane.grids.grid_RA.layout.setColumnVisibility(2,false);
		} else if (queryParams.from == 'RA') {
			var grid = pane.grids.grid_RA;
			//Set gridRA container size if previous query was a Room Records query
			if (pane.vars.previousFrom == 'R') {
  			var newContainerHeight = dojo.marginBox(pane.vars.layoutContainer_grids.domNode).h - 125; //Set gridR container height to 125px
  			pane.vars.layoutContainer_gridRA.resize({h: newContainerHeight});
  			pane.vars.layoutContainer_grids.layout();
  		}
  		//Disconnect grid select listeners
			//dojo.disconnect(pane.grids.grid_R.evt.onSelected);
			//Set grid stores to empty
			pane.grids.grid_R.selection.clear();
			pane.grids.grid_R.setStore(store_empty);
			pane.grids.grid_RAB.selection.clear();
			pane.grids.grid_RAB.setStore(store_empty);
			pane.grids.grid_RAO.selection.clear();
			pane.grids.grid_RAO.setStore(store_empty);
			pane.grids.grid_RAU.selection.clear();
			pane.grids.grid_RAU.setStore(store_empty);
			//Show/hide columns
			pane.grids.grid_R.layout.setColumnVisibility(0,false);
			pane.grids.grid_R.layout.setColumnVisibility(2,false);
			grid.layout.setColumnVisibility(1,true);
			grid.layout.setColumnVisibility(2,true);
		} else if (queryParams.from == 'B') {
			var grid = pane.grids.grid_B;
			pane.grids.grid_BRA.selection.clear();
			pane.grids.grid_BRA.setStore(store_empty);
		}
		pane.vars.previousFrom = queryParams.from;
		grid.selection.clear();
    var store_new = new dojo.data.ItemFileWriteStore({
  		data: {
  			items: data
  		}
  	});
  	store_new.storeKind = queryParams.from;
  	store_new.onSetListener = dojo.connect(store_new, "onSet", grid.evt.onSetFunction);
  	store_new.storeGrid = grid; //Add custom property storeGrid
		store_new.onDeleteListener = dojo.connect(store_new, "onDelete", grid.evt.onDeleteFunction);
		//store_new.onNewListener = dojo.connect(store_new, "onNew", onNewFunction);
		grid.setStore(store_new);
		if (data.length > 0) { //Select first row of data if there are results
			grid.selection.addToSelection(0);
		}
	});
	queryDeferred.addErrback(function(data) {
		console.log('QUERY ERROR!',data);
	});
}

function setDirtyQuery(pane, isDirty) {
	pane.vars.queryIsDirty = isDirty;
	if (isDirty === false) {
		dojo.removeClass(pane.vars.queryBox, "isDirty");
	} else {
		dojo.addClass(pane.vars.queryBox, "isDirty");
	}
}

//Create HTML for items in whereItems
function populateWhereItems(pane, container, whereItems, groupParent) {
	if (typeof groupParent == "undefined") {
		groupParent = pane.vars.query.where;
	}
	//Get each item in list
	dojo.forEach(whereItems, function(whereItem, i) {
		/**if (whereItem.operator) { //Check for operator item
			var operatorContainer = dojo.create("div",{"class":"queryItem queryOperator",innerHTML:'edit'},container);
			dojo.create("span",{innerHTML:whereItem.operator},operatorContainer, "first");
		}**/
		if (whereItem.item.length == 1) { //If the item list length is 1, this is a condition of the where statement
			var condition = whereItem.item[0];
			var conditionDeleteParams = [groupParent, whereItems, i]; //Save parameters necessary for deleting a condition
			//var conditionDelete = dojo.create("span",{"class":"deleteItem",innerHTML:'X', onclick:function(evt) {dojo.stopEvent(evt);removeQueryCondition(pane, groupParent, whereItems, i);}});
			var conditionContainer = dojo.create("div",{"class":"queryItem queryCondition notEditing",onclick:function(evt) {dojo.stopEvent(evt);editQueryCondition(pane, conditionContainer, condition, conditionDeleteParams);}},container);
			dojo.create("span",{innerHTML:pane.vars.fields[condition.field].label + (pane.vars.fields[condition.field].predicateOptions == 'none' ? '' : ' '+pane.vars.fields[condition.field].predicateOptions[condition.predicate].label) + (pane.vars.fields[condition.field].valueLabels[condition.value] ? ' '+pane.vars.fields[condition.field].valueLabels[condition.value] : '')},conditionContainer,"first");
			dojo.create("span",{"class":"editItem",innerHTML:'edit'},conditionContainer);
		} else if (whereItem.item.length > 1) { //If the item list length is greater than 1 this is a group of items
			var groupContainer = dojo.create("div",{"class":"queryItem queryGroup"},container);
			//groupContainer.appendChild(dojo.doc.createTextNode("Facility"));
			populateWhereItems(pane, groupContainer, whereItem.item, whereItems);
			//groupContainer.appendChild(dojo.doc.createTextNode("X"));
		}
	});
	pane.vars.submitQueryButton.focus(); //Set focus to Submit Query button
}

//Sort and group the query conditions by field (column name)
function organizeQueryConditions(whereGroup, fieldIndexes, organizedWhereGroup) {
	dojo.forEach(whereGroup, function(whereItem, i) {
		if (whereItem.item.length == 1) {
			var item = whereItem.item[0];
			var fieldIndex = dojo.indexOf(fieldIndexes,item.field);
			if (fieldIndex !== -1) {
				whereItem.operator = 'OR';
				var itemGroup = organizedWhereGroup[fieldIndex];
				var itemCopy = {item:[{field:itemGroup.item[0].field,predicate:itemGroup.item[0].predicate,value:itemGroup.item[0].value,formElement:itemGroup.item[0].formElement}]};
				//if (itemGroup.item[0].formElement) itemCopy.item[0].formElement = itemGroup.item[0].formElement; //Null check not needed? Above might work
				if (itemGroup.item.length == 1) {
					organizedWhereGroup[fieldIndex].item = [itemCopy,whereItem];
				} else {
					organizedWhereGroup[fieldIndex].item.push(whereItem);
				}

			} else {
				var fieldIndex = fieldIndexes.length;
				fieldIndexes.push(item.field);
				if (fieldIndex > 0) whereItem.operator = 'AND';
				organizedWhereGroup[fieldIndex] = whereItem;
			}
		} else if (whereItem.item.length > 1) {
			var returnArr = organizeQueryConditions(whereItem.item, fieldIndexes, organizedWhereGroup);
			fieldIndexes = returnArr[0];
			organizedWhereGroup = returnArr[1];
		}
	});
	return [fieldIndexes, organizedWhereGroup];
}

function editQueryCondition(pane, conditionContainer, condition, conditionDeleteParams) {
	//console.log('EDIT CONDITION', conditionContainer, condition);
	dojo.style(pane.vars.queryBoxAdd,"display","none");
	dojo.empty(conditionContainer);

	var formContainer = conditionContainer;

	pane.vars.queryBoxForm = new dijit.form.Form({
		"class":"queryItem queryCondition newCondition",
		onSubmit:function() {
			var newFilter = this.get('value');
			if ("undefined" !== typeof newFilter.field) {
  			//console.log('set value:',this,newFilter, condition);
  			if (pane.vars.fields[newFilter.field].predicateOptions == 'none') {
  				newFilter.predicate = null;
  				newFilter.value = null;
  			}
  			if (newFilter.value != '') {
  				//Run value formatter to properly format the value for this column, if the function exists
  				if (pane.vars.fields[newFilter.field].valueFormatter) {
  					newFilter.value = pane.vars.fields[newFilter.field].valueFormatter(newFilter.value,newFilter.predicate);
  				}
  				if (condition.isNew == true) {
  					var newItem = {
          		'item': [
          			{}
          		]
          	};
          	if (pane.vars.query.where.length !== 0) newItem.operator = 'AND';
          	pane.vars.query.where.push(newItem);
          	condition = newItem.item[0];
  				}
  				if (condition.field !== newFilter.field || condition.predicate !== newFilter.predicate || condition.value !== newFilter.value) { //Compare new and old condition values
    				condition.field = newFilter.field;
          	condition.predicate = newFilter.predicate;
          	condition.value = newFilter.value;
          	if (valueSelect) condition.formElement = valueSelect; //Save the value form element for reuse
          	if (!pane.vars.fields[condition.field].valueLabels) { //Add field valueLabels array if it does not exist
          		pane.vars.fields[condition.field].valueLabels = {};
          	}
          	pane.vars.fields[condition.field].valueLabels[condition.value] = valueSelect.displayedValue; //Add displayed value

          	//Properly group condition with other conditions with equal fields
          	var organizedQuery = organizeQueryConditions(pane.vars.query.where, [], []);
          	//console.log(organizedQuery);/
          	pane.vars.query.where = organizedQuery[1];
      			setDirtyQuery(pane, true);
      		}

  				dojo.empty(pane.vars.queryBoxConditions);
  				populateWhereItems(pane, pane.vars.queryBoxConditions, pane.vars.query.where);
  				dojo.style(pane.vars.queryBoxAdd,"display","");
  			} else {
  				//No change in value, mimic 'cancel' button
  				dojo.empty(pane.vars.queryBoxConditions);
  				populateWhereItems(pane, pane.vars.queryBoxConditions, pane.vars.query.where);
  				dojo.style(pane.vars.queryBoxAdd,"display","");
  			}
			}
			return false;
		}

	},formContainer);

	var fieldOptions = getSelectOptions(pane.vars.fields, condition.field);
	//console.log(fieldOptions);
	var fieldSelect = new dijit.form.Select({
    name: 'field',
    "class": 'queryInput',
    options: fieldOptions,
    onChange: function(val) {
    	//console.log(val);
    	if (pane.vars.fields[val].predicateOptions != 'none') {
    		predicateSelect.set('options',getSelectOptions(pane.vars.fields[val].predicateOptions));
    		predicateSelect.updateOption();
    		predicateSelect.placeAt(predicateSelectContainer);
			} else {
				dojo.empty(predicateSelectContainer);
			}

    	if (pane.vars.fields[val].formElement) { //The new field has a form element defined
    		if (valueSelect === pane.vars.fields[val].formElement) { //The current value select form element equals the new field's form element
    			if (valueSelect.store && valueSelect.store !== pane.vars.fields[val].valueStore) {
    				valueSelect.set('value', null);
    				valueSelect.set('store',pane.vars.fields[val].valueStore);
    			}
    		} else {
    			dojo.empty(valueSelectContainer);
      		valueSelect = pane.vars.fields[val].formElement();
      		if (valueSelect != 'none') {
      			valueSelect.set('value', null);
      			if (pane.vars.fields[val].valueStore) {
      				valueSelect.set('store',pane.vars.fields[val].valueStore);
      			}
      			valueSelect.placeAt(valueSelectContainer);
      		}
    		}
    	} else if (valueSelect.declaredClass == 'dijit.form.TextBox') {
    		valueSelect.set('value', null);
    		valueSelect.placeAt(valueSelectContainer);
    	} else {
    		dojo.empty(valueSelectContainer);
    		valueSelect = new dijit.form.TextBox({
          name: 'value',
          "class": 'queryInput valueSelect'
        }).placeAt(valueSelectContainer);
    	}
    }
  }).placeAt(pane.vars.queryBoxForm.containerNode);
  fieldSelect.focus();

  var predicateSelectContainer = dojo.create("span",{},pane.vars.queryBoxForm.containerNode);
  var predicateOptions = getSelectOptions(pane.vars.fields[fieldSelect.get('value')].predicateOptions, condition.predicate);
  var predicateSelect = new dijit.form.Select({
    name: 'predicate',
    "class": 'queryInput',
    options: predicateOptions
  });
  if (pane.vars.fields[fieldSelect.value].predicateOptions != 'none') predicateSelect.placeAt(predicateSelectContainer);

  var valueSelectContainer = dojo.create("span",{},pane.vars.queryBoxForm.containerNode);
  if (condition.formElement) {
  	var valueSelect = condition.formElement;
  	valueSelect.placeAt(valueSelectContainer);
  } else if (pane.vars.fields[fieldSelect.value].formElement) {
  	var valueSelect = pane.vars.fields[fieldSelect.value].formElement();
  	if (valueSelect != 'none') {
    	valueSelect.set('value', (condition.value ? condition.value : null));
    	if (pane.vars.fields[fieldSelect.value].valueStore) {
    		valueSelect.set('store',pane.vars.fields[fieldSelect.value].valueStore);
    	}
    	valueSelect.placeAt(valueSelectContainer);
    }
  } else {
  	var valueSelect = new dijit.form.TextBox({
      name: 'value',
      "class": 'queryInput valueSelect',
      value: condition.value
  	}).placeAt(valueSelectContainer);
  }

  var addFilterButton = new dijit.form.Button({
  	label: "Okay",
  	"class":"queryButton",
  	type: "submit"
  }).placeAt(pane.vars.queryBoxForm.containerNode);

  var cancelEditButton = new dijit.form.Button({
  	label: "Cancel",
  	"class":"queryButton",
  	onClick: function() {
  		dojo.empty(pane.vars.queryBoxConditions);
			populateWhereItems(pane, pane.vars.queryBoxConditions, pane.vars.query.where);
			dojo.style(pane.vars.queryBoxAdd,"display","");
  	}
  }).placeAt(pane.vars.queryBoxForm.containerNode);

	var deleteFilterButton = new dijit.form.Button({
  	label: "Delete",
  	"class":"queryButton",
  	onClick: function() {
  		removeQueryCondition(pane, conditionDeleteParams[0], conditionDeleteParams[1], conditionDeleteParams[2]);
  	}
  }).placeAt(pane.vars.queryBoxForm.containerNode);
}

function removeQueryCondition(pane, groupParent, conditionGroup, conditionIndex) {
	//console.log('REMOVE CONDITION', groupParent, conditionGroup, conditionIndex);

	if (groupParent || conditionGroup || conditionIndex) {
  	//Remove element at given index from condition array
  	var removedCondition = conditionGroup.splice(conditionIndex,1);

  	if (conditionIndex === 0 && conditionGroup.length > 0) {
  		delete conditionGroup[0].operator;
  	}
  	//console.log('group', conditionGroup, 'eql?', groupParent === conditionGroup);
  	if (conditionGroup.length === 1) {
  		dojo.forEach(groupParent, function(parentItem, i) {
  			if (parentItem.item === conditionGroup) {
  				//console.log(parentItem, conditionGroup);
  				parentItem.item = conditionGroup[0].item;
  			}
  		});
  	}
  	if (removedCondition.length > 0) setDirtyQuery(pane, true);
  	//console.log('final group parent',groupParent);
	}
	dojo.empty(pane.vars.queryBoxConditions);
	populateWhereItems(pane, pane.vars.queryBoxConditions, pane.vars.query.where);
	dojo.style(pane.vars.queryBoxAdd,"display","");

	//if (removedCondition.length == 0 && pane.vars.query.where.length == 0) addQueryCondition(pane);
	return;// removedCondition;
}

//Create HTML for adding a new query condition
function addQueryCondition(pane) {
	//dojo.style(pane.vars.queryBoxAdd,"display","none");

	var conditionContainer = pane.vars.queryBoxConditions;
	var conditionItem = {
		'item': [
			{
				'isNew':true
			}
		]
	};
	var conditionDelete = dojo.create("span",{"class":"deleteItem",innerHTML:'X', onclick:function(evt) {dojo.stopEvent(evt);removeQueryCondition(pane, pane.vars.query.where, pane.vars.query.where, pane.vars.query.where.length + 1);}});
	var condition = dojo.create("div",{"class":"queryItem queryCondition"}, conditionContainer);

	editQueryCondition(pane, condition, conditionItem.item[0], conditionDelete);
}

//Create HTML for the query box
function populateQueryBox(pane, query) {
	if (!(query.from && query.where)) return false;
	//console.log(pane, query);
	pane.vars.query = query;
	setDirtyQuery(pane, false);

	var queryBox = pane.vars.queryBox;
	dojo.empty(queryBox); //Remove children

	if (pane.vars.queryType == "Space") {
  	//Make query source select
  	var sourceSelect = new dijit.form.Select({
      name: 'sourceSelect',
      "class": 'querySourceSelect',
      options: [{
          label: 'Room Records',
          value: 'R',
          selected: (query.from == 'R')
      },
      {
          label: 'Room Assignment Records',
          value: 'RA',
          selected: (query.from == 'RA')
      }],
      onChange: function(newValue) {
      	//console.log(newValue);
      	pane.vars.query.from = newValue;
      	setDirtyQuery(pane, true);
      	pane.vars.submitQueryButton.focus(); //Set focus to Submit Query button
      }
    }).placeAt(queryBox);
  }

	pane.vars.queryBoxConditions = dojo.create("div",{"class":"queryConditions"},queryBox);
	populateWhereItems(pane, pane.vars.queryBoxConditions, pane.vars.query.where);

	pane.vars.queryBoxAdd = dojo.create("div",{"class":"queryItem queryAdd",innerHTML:'add new search condition',onclick:function() {addQueryCondition(pane)}},queryBox);
	if (query.where.length == 0) {
		addQueryCondition(pane);
	}

	return true;
}

function makeAddQueryTab(tabs) {
	var pane = new dijit.layout.ContentPane({ title:"+", tooltip:"Add a new query", closable: false, disabled:true});
	tabs.addChild(pane);

	dojo.connect(tabs.tablist,"onButtonClick",function(page) {
		if (page === pane) {
			newQueryTab(tabs);
		}
	});
}

function makeFrontTab(tabs) {
	//console.log('new tab', tabs);
	//Make DOM structure
	var bc = new dijit.layout.BorderContainer({});

	var qTab_resultBC = new dijit.layout.BorderContainer({region:'center',design:'sidebar'});
	var qTab_resultBC_R = new dijit.layout.BorderContainer({region:'center',gutters:true});
	var qTab_resultBC_R_cont = new dijit.layout.ContentPane({region:'center',content:"This is the GeoSIMS Data Viewer."});
	qTab_resultBC_R.addChild(qTab_resultBC_R_cont);
	var qTab_resultBC_RAchild = new dijit.layout.BorderContainer({region:'right',style:'width:50%;',gutters:true});
	var qTab_resultBC_RA_cont = new dijit.layout.ContentPane({region:'center'});
	qTab_resultBC_RAchild.addChild(qTab_resultBC_RA_cont);
	qTab_resultBC.addChild(qTab_resultBC_R);
	qTab_resultBC.addChild(qTab_resultBC_RAchild);
	bc.addChild(qTab_resultBC);

	var pane = new dijit.layout.ContentPane({ title:"Welcome", closable: false, content: bc });
	tabs.addChild(pane);
}



function newQueryTab_space(pane) {
	//If user is not authorized to use application, show message
	if (hasAuthz(authz) == false) {
		showNotAuthzd();
		return;
	}
	//Make DOM structure
	var bc = new dijit.layout.BorderContainer({});

	var qTab_queryCP = new dijit.layout.ContentPane({region:'top',style:'height:100px;overflow:auto;',"class":"queryTab_query"});
	var qTab_queryBox = dojo.create("div",{"class":"queryBox"},qTab_queryCP.domNode);
	var qTab_queryEdit = dojo.create("div",{"class":"queryEdit"},qTab_queryCP.domNode);

	var submitQueryButton = new dijit.form.Button({
  	label: "Submit Query",
  	onClick: function() {
  		makeQuery(pane);
  	}
  },dojo.create("div",{"class":"queryButton"},qTab_queryEdit));

	bc.addChild(qTab_queryCP);

	var qTab_resultBC = new dijit.layout.BorderContainer({region:'center',design:'sidebar'});

	var qTab_resultBC_R = new dijit.layout.BorderContainer({region:'center',gutters:false});
	qTab_resultBC_R_title = new dijit.layout.ContentPane({region:'top',style:'height:1.6em;',"class":"gridTitle",content:"Room"});

	var qTab_resultBC_R_grid = new dijit.layout.ContentPane({region:'center'});
	qTab_resultBC_R.addChild(qTab_resultBC_R_title);
	qTab_resultBC_R.addChild(qTab_resultBC_R_grid);
	qTab_resultBC.addChild(qTab_resultBC_R);

	var qTab_resultBC_RA = new dijit.layout.BorderContainer({region:'bottom',style:'height:33%;',splitter:true,gutters:false});
	var qTab_resultBC_RA_title = new dijit.layout.ContentPane({region:'top',style:'height:1.6em;',"class":"gridTitle",content:"Room Assignment"});
	var qTab_resultBC_RA_grid = new dijit.layout.ContentPane({region:'center'});
	qTab_resultBC_RA.addChild(qTab_resultBC_RA_title);
	qTab_resultBC_RA.addChild(qTab_resultBC_RA_grid);
	qTab_resultBC.addChild(qTab_resultBC_RA);

	var qTab_resultBC_RAchild = new dijit.layout.BorderContainer({region:'right',style:'width:25%;',splitter:true});

	var qTab_resultBC_RAchild_RAB = new dijit.layout.BorderContainer({region:'top',style:'height:33%;',splitter:true,gutters:false});
	var qTab_resultBC_RAchild_RAB_title = new dijit.layout.ContentPane({region:'top',style:'height:1.6em;',"class":"gridTitle",content:"Budgets"});
	var qTab_resultBC_RAchild_RAB_grid = new dijit.layout.ContentPane({region:'center'});
	qTab_resultBC_RAchild_RAB.addChild(qTab_resultBC_RAchild_RAB_title);
	qTab_resultBC_RAchild_RAB.addChild(qTab_resultBC_RAchild_RAB_grid);
	qTab_resultBC_RAchild.addChild(qTab_resultBC_RAchild_RAB);

	var qTab_resultBC_RAchild_RAO = new dijit.layout.BorderContainer({region:'center',style:'height:33%;',gutters:false});
	var qTab_resultBC_RAchild_RAO_title = new dijit.layout.ContentPane({region:'top',style:'height:1.6em;',"class":"gridTitle",content:"Occupants"});
	var qTab_resultBC_RAchild_RAO_grid = new dijit.layout.ContentPane({region:'center'});
	qTab_resultBC_RAchild_RAO.addChild(qTab_resultBC_RAchild_RAO_title);
	qTab_resultBC_RAchild_RAO.addChild(qTab_resultBC_RAchild_RAO_grid);
	qTab_resultBC_RAchild.addChild(qTab_resultBC_RAchild_RAO);

	var qTab_resultBC_RAchild_RAU = new dijit.layout.BorderContainer({region:'bottom',style:'height:33%;',splitter:true,gutters:false});
	var qTab_resultBC_RAchild_RAU_title = new dijit.layout.ContentPane({region:'top',style:'height:1.6em;',"class":"gridTitle",content:"Functional Uses"});
	var qTab_resultBC_RAchild_RAU_grid = new dijit.layout.ContentPane({region:'center'});
	qTab_resultBC_RAchild_RAU.addChild(qTab_resultBC_RAchild_RAU_title);
	qTab_resultBC_RAchild_RAU.addChild(qTab_resultBC_RAchild_RAU_grid);
	qTab_resultBC_RAchild.addChild(qTab_resultBC_RAchild_RAU);

	qTab_resultBC.addChild(qTab_resultBC_RAchild);

	bc.addChild(qTab_resultBC);

	pane.set("title","Space Query (0)");
	pane.set("content",bc);

	pane.vars = {};
	pane.vars.queryType = "Space";
	pane.vars.queryStores = {};
	pane.vars.queryStores.qStore_facs = new CustomQueryReadStore({url:'common/php/qFacilities.php', requestMethod:'get'}); //Create query store for budgets
	pane.vars.queryStores.qStore_org = new CustomQueryReadStore({url:'common/php/organizations.php', requestMethod:'get'}); //Create query store for organizations
	pane.vars.queryStores.qStore_emp = new CustomQueryReadStore({url:'common/php/employees.php', requestMethod:'get'}); //Create query store for employees
	pane.vars.queryStores.qStore_bdgt = new CustomQueryReadStore({url:'common/php/budgets.php', requestMethod:'get'}); //Create query store for budgets
	pane.vars.queryStores.qStore_priUse = new CustomQueryReadStore({url:'common/php/qPrimaryUse.php', requestMethod:'get'}); //Create query store for primary uses
	pane.vars.queryStores.qStore_spaceCat = new dojo.data.ItemFileReadStore({url:'common/js/data-spaceCategory.json'});
	pane.vars.queryStores.qStore_funcUse = new CustomQueryReadStore({url:'common/php/qFunctionalUse.php', requestMethod:'get'}); //Create query store for func uses
	pane.vars.formWidgets = {};
	pane.vars.formWidgets.formWdgt_date = function() {return new dijit.form.DateTextBox({name:'value'})};
	pane.vars.formWidgets.formWdgt_filterSelect = function() {
		return new dijit.form.FilteringSelect({
      name: 'value',
      store: store_empty,
      "class": 'queryInput valueSelect',
      searchAttr:"DESCR",
      queryExpr:"*${0}*",
      required:false,
      autoComplete:false,
      highlightMatch:"all",
      labelType:"text",
      searchDelay:500
    });
	}
	pane.vars.fields = {
		'FACILITY_CODE':{
			label:'Facility',
			valueStore:pane.vars.queryStores.qStore_facs,
			formElement:pane.vars.formWidgets.formWdgt_filterSelect,
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		}
    	}
		},
		'R.FLOOR_CODE':{
			label:'Floor',
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		}
    	}
		},
		'ROOM_NUMBER':{
			label:'Room Number',
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		}/**,
    		'LIKE':{
    			label:'LIKE'
    		},
    		'NOT LIKE':{
    			label:'NOT LIKE'
    		}**/
    	}
		},
		'R.SQUARE_FEET':{
			label:'Square Feet',
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		},
    		'>':{
    			label:'>'
    		},
    		'<':{
    			label:'<'
    		}
    	}
		},
		'R.ROOM_TYPE':{
			label:'Primary Use',
			valueStore:pane.vars.queryStores.qStore_priUse,
			formElement:pane.vars.formWidgets.formWdgt_filterSelect,
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		},
    		'>':{
    			label:'>'
    		},
    		'<':{
    			label:'<'
    		}
    	}
		},
		'RT.SPACE_CATEGORY':{
			label:'Space Category',
			valueStore:pane.vars.queryStores.qStore_spaceCat,
			formElement:pane.vars.formWidgets.formWdgt_filterSelect,
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		}
    	}
		},
		'R.ORGANIZATION':{
			label:'Room Organization',
			valueStore:pane.vars.queryStores.qStore_org,
			formElement:pane.vars.formWidgets.formWdgt_filterSelect,
			predicateOptions:
			{
    		'LIKE':{
    			label:'= <span class="queryElement-subtext">(incl. sub-orgs)</span>'
    		},
    		'=':{
    			label:'= <span class="queryElement-subtext">(exact org)</span>'
    		},
    		'NOT LIKE':{
    			label:'NOT = <span class="queryElement-subtext">(incl. sub-orgs)</span>'
    		},
    		'<>':{
    			label:'NOT = <span class="queryElement-subtext">(exact org)</span>'
    		}
    	},
    	valueFormatter: function(value, condition) {
    		if (dojo.indexOf(['LIKE', 'NOT LIKE'],condition) > -1) {
      		value = value.replace(/0*$/g,''); //Remove trailing zeros
      		if (value.length < 9 && value.length%2 == 0) value = value + '0'; //Pad to odd length (org structure: X-XX-XX-XX-XX-X)
      		if (value.length < 10) value = value + '%'; //Add '%' if less org is less than 10 digits
      	}
      	return value;
    	}
		},
		'R.CAPACITY':{
			label:'Capacity',
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		},
    		'>':{
    			label:'>'
    		},
    		'<':{
    			label:'<'
    		}
    	}
		},
		'R.CONFIRM_USER':{
			label:'Last Confirmed User',
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		}
    	}
		},
		'R.CONFIRM_DATE':{
			label:'Last Confirmed Date',
			formElement:pane.vars.formWidgets.formWdgt_date,
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		},
    		'>':{
    			label:'>'
    		},
    		'<':{
    			label:'<'
    		}
    	},
    	valueFormatter: function(value, condition) {
    		return convertDate(value);
    	}
		},
		'RA.ASSIGNEE_ORGANIZATION':{
			label:'Room Assignment Organization',
			valueStore:pane.vars.queryStores.qStore_org,
			formElement:pane.vars.formWidgets.formWdgt_filterSelect,
			predicateOptions:
			{
    		'LIKE':{
    			label:'= <span class="queryElement-subtext">(incl. sub-orgs)</span>'
    		},
    		'=':{
    			label:'= <span class="queryElement-subtext">(exact org)</span>'
    		},
    		'NOT LIKE':{
    			label:'NOT = <span class="queryElement-subtext">(incl. sub-orgs)</span>'
    		},
    		'<>':{
    			label:'NOT = <span class="queryElement-subtext">(exact org)</span>'
    		}
    	},
    	valueFormatter: function(value, condition) {
    		if (dojo.indexOf(['LIKE', 'NOT LIKE'],condition) > -1) {
      		value = value.replace(/0*$/g,''); //Remove trailing zeros
      		if (value.length < 9 && value.length%2 == 0) value = value + '0'; //Pad to odd length (org structure: X-XX-XX-XX-XX-X)
      		if (value.length < 10) value = value + '%'; //Add '%' if less org is less than 10 digits
      	}
      	return value;
    	}
		},
		'RA.ASSIGNEE_EMPLOYEE_ID':{
			label:'Room Assignment P.I.',
			valueStore:pane.vars.queryStores.qStore_emp,
			formElement:pane.vars.formWidgets.formWdgt_filterSelect,
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		}
    	}
		},
		'RA.ASSIGNEE_ROOM_PERCENT':{
			label:'Room Assignment Room Percent',
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		},
    		'>':{
    			label:'>'
    		},
    		'<':{
    			label:'<'
    		}
    	}
		},
		'RAO.OCCUPANT_ID':{
			label:'Occupant',
			valueStore:pane.vars.queryStores.qStore_emp,
			formElement:pane.vars.formWidgets.formWdgt_filterSelect,
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		}
    	}
		},
		'RAU.FUNCTIONAL_USE_CODE':{
			label:'Functional Use',
			valueStore:pane.vars.queryStores.qStore_funcUse,
			formElement:pane.vars.formWidgets.formWdgt_filterSelect,
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		}
    	}
		},
		'RAU.FUNCTIONAL_USE_PERCENT':{
			label:'Functional Use Percent',
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		},
    		'>':{
    			label:'>'
    		},
    		'<':{
    			label:'<'
    		}
    	}
		},
		'RAB.BUDGET_NUMBER':{
			label:'Budget Number',
			valueStore:pane.vars.queryStores.qStore_bdgt,
			formElement:pane.vars.formWidgets.formWdgt_filterSelect,
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		}
    	}
		}
	};

	//Add 'Edit Selected' button to table title
	function makeEditDialogContent(pane) {
		//Dialog container and row authzd and row selection totals
  	editDialogContent_R = dojo.create("div",{"class":"editSelectedDialog",innerHTML:"<div class='editSelected-rowTotal'></div>"},null);

		//Container for edit selected records value form
  	var editSelected = dojo.create("div",{"class":"editFieldContainer",innerHTML:"<div>Edit field value for selected records</div>"},editDialogContent_R);

  	//Edit selected records value form
  	var editForm = new dijit.form.Form({
  		"class":"editFieldContainer",
  		onSubmit:function() {

  			var grid = pane.grids.grid_R;
    		var recordID = [];
    		var gridSelection = grid.selection.getSelected();
    		var authzdItems = [];  //Authorized items
  			dojo.forEach(gridSelection,function(selItem){
  				//console.log(selItem);
  				var item_facNum = grid.store.getValue(selItem, "FACILITY_NUMBER");
  				var item_orgCode = grid.store.getValue(selItem, "ORGANIZATION");
  				//console.log(item_facCode,item_roomNum);
  				if (checkAuthz(authz, item_facNum, item_orgCode, null)) {
  					var item_facCode = grid.store.getValue(selItem, "FACILITY_CODE");
  					var item_roomNum = grid.store.getValue(selItem, "ROOM_NUMBER");
  					recordID.push([item_facCode,item_roomNum]);
  					authzdItems.push(selItem);  //Save items the user is authorized to update
  				}
  			});

  			if (recordID.length > 0) {
  				var updateColumn = fieldSelect.value;
  				var updateValue = valueSelect.value;
  				var update = {
          	records : recordID,
          	values : {}
          };

          update.values[updateColumn] = updateValue;

  				editSelected_status.innerHTML = 'Updating..';

  				var onUpdateSelected = submitQuery(dojo.toJson(update),"common/php/updateColumnForSelectedRows.php");
    			onUpdateSelected.addCallback(function(data) {
    				dojo.disconnect(grid.store.onSetListener);
    				dojo.forEach(authzdItems,function(selItem){
      				//Update the value in the grid
      				grid.store.setValue(selItem, updateColumn.split('.',2)[updateColumn.split('.',2).length-1], updateValue);
      				//Update any returned values in the grid (e.g. Org name, PI name, etc.)
      				for (returnedValueColumn in data.values) {
      					//console.log(returnedValueColumn, data.values[returnedValueColumn]);
      					grid.store.setValue(selItem, returnedValueColumn, data.values[returnedValueColumn]);
      				}
      			});
    				grid.store.save();
    				grid.store.onSetListener = dojo.connect(grid.store, "onSet", grid.evt.onSetFunction);

    				editSelected_status.innerHTML = data.rowsUpdated + ' record' + (data.rowsUpdated === 1 ? '' : 's') + ' updated.';

    				postClientMessage({
        			text:"Updated.",
        			type:"success"
        		});
    			});

    		}
    		return false;
  		}
  	},editSelected);

  	//Field selection
  	var fieldSelect = new dijit.form.Select({
      name: 'editField',
      "class": 'editSelected-rows',
      options: [{
          label: 'Room Type',
          value: 'R.ROOM_TYPE'
      },
      {
          label: 'Room Organization',
          value: 'R.ORGANIZATION'
      },
      {
          label: 'Capacity',
          value: 'R.CAPACITY'
      }],
      onChange: function(val) {
      	//console.log(val);

      	if (pane.vars.fields[val].formElement) { //The new field has a form element defined
      		if (valueSelect === pane.vars.fields[val].formElement) { //The current value select form element equals the new field's form element
      			if (valueSelect.store && valueSelect.store !== pane.vars.fields[val].valueStore) {
      				valueSelect.set('value', null);
      				valueSelect.set('store',pane.vars.fields[val].valueStore);
      			}
      		} else {
      			dojo.empty(valueSelectContainer);
        		valueSelect = pane.vars.fields[val].formElement();
        		if (valueSelect != 'none') {
        			valueSelect.set('value', null);
        			if (pane.vars.fields[val].valueStore) {
        				valueSelect.set('store',pane.vars.fields[val].valueStore);
        			}
        			valueSelect.placeAt(valueSelectContainer);
        		}
      		}
      	} else if (valueSelect.declaredClass == 'dijit.form.TextBox') {
      		valueSelect.set('value', null);
      		valueSelect.placeAt(valueSelectContainer);
      	} else {
      		dojo.empty(valueSelectContainer);
      		valueSelect = new dijit.form.TextBox({
            name: 'value',
            "class": 'queryInput valueSelect'
          }).placeAt(valueSelectContainer);
      	}

      }
    }).placeAt(editForm.containerNode);

    //Value entry box
    var valueSelectContainer = dojo.create("span",{},editForm.containerNode);
    if (pane.vars.fields[fieldSelect.value].formElement) {
    	var valueSelect = pane.vars.fields[fieldSelect.value].formElement();
    	if (valueSelect != 'none') {
      	//valueSelect.set('value', (condition.value ? condition.value : null));
      	if (pane.vars.fields[fieldSelect.value].valueStore) {
      		valueSelect.set('store',pane.vars.fields[fieldSelect.value].valueStore);
      	}
      	valueSelect.placeAt(valueSelectContainer);
      }
    } else {
    	var valueSelect = new dijit.form.TextBox({
        name: 'value',
        "class": 'queryInput valueSelect'
        //value: condition.value
    	}).placeAt(valueSelectContainer);
    }

    //Update field submit button
    var submitEditButton = new dijit.form.Button({
    	label: "Update Field",
    	"class":"editSelected-button",
    	type: "submit"
    }).placeAt(editForm.containerNode);

    var editSelected_status = dojo.create("div",{"class":"editSelected-status"},editForm.containerNode);

  	//Confirm selected button
  	var confirmSelected = new dijit.form.Button({
    	label: "Confirm Selected Rooms As Correct",
    	"class":"editSelected-button",
    	onClick: function() {
    		var grid = pane.grids.grid_R;
    		var recordID = [];
    		var gridSelection = grid.selection.getSelected();
    		var authzdItems = [];  //Authorized items
  			dojo.forEach(gridSelection,function(selItem){
  				//console.log(selItem);
  				var item_facNum = grid.store.getValue(selItem, "FACILITY_NUMBER");
  				var item_orgCode = grid.store.getValue(selItem, "ORGANIZATION");
  				//console.log(item_facCode,item_roomNum);
  				if (checkAuthz(authz, item_facNum, item_orgCode, null)) {
  					var item_facCode = grid.store.getValue(selItem, "FACILITY_CODE");
  					var item_roomNum = grid.store.getValue(selItem, "ROOM_NUMBER");
  					recordID.push({'FACILITY_CODE':item_facCode,'ROOM_NUMBER':item_roomNum});
  					authzdItems.push(selItem);  //Save item to update confirm_date, confirm_user on success
  				}
  			});

  			if (recordID.length > 0) {
    			var onCurrentDeferred = submitQuery(dojo.toJson(recordID),"common/php/updateroomconfirm.php");
    			onCurrentDeferred.addCallback(function(data) {
    				dojo.disconnect(grid.store.onSetListener);
    				dojo.forEach(authzdItems,function(selItem){
      				grid.store.setValue(selItem, 'CONFIRM_DATE', data.value['CONFIRM_DATE']);
      				grid.store.setValue(selItem, 'CONFIRM_USER', data.value['CONFIRM_USER']);
      			});
    				grid.store.save();
    				grid.store.onSetListener = dojo.connect(grid.store, "onSet", grid.evt.onSetFunction);
    			});
    			postClientMessage({
        		text:"Updated.",
        		type:"success"
        	});
    		}
    	}
    }).placeAt(editDialogContent_R);

    var editSelected = dojo.create("div",{"class":"editSelected-instructions",innerHTML:"Selection controls:<ul><li>Ctrl-Click: Add or remove a record from the current selection.</li><li>Shift-Click: Select a range of rows in the table.</li><li>Ctrl-Shift-Click: Add a range of rows to the current selection</li></ul>"},editDialogContent_R);

    return editDialogContent_R;
  }
	var qTab_resultBC_R_title_editContent = makeEditDialogContent(pane)
	var qTab_resultBC_R_title_edit = new dijit.form.Button({
  	label: "Edit Selected",
  	"class":"tableEdit",
  	style:"color:black;font-weight:normal;margin-top:0;margin-bottom:0;padding:0;font-size:.7em;",
  	"data-geosims-editSelectedDialog":null,
  	onClick: function() {
  		if (!this["data-geosims-editSelectedDialog"]) {
    		this["data-geosims-editSelectedDialog"] = new dijit.Dialog({
    			title:"Edit Selected",
    			content:qTab_resultBC_R_title_editContent,
    			style:"width:50%;",
    			onShow: function() {
    				var grid = pane.grids.grid_R;
        		var recordID = [];
        		var gridSelection = grid.selection.getSelected();
        		var authzdItems = [];  //Authorized items
      			dojo.forEach(gridSelection,function(selItem){
      				//console.log(selItem);
      				var item_facNum = grid.store.getValue(selItem, "FACILITY_NUMBER");
      				var item_orgCode = grid.store.getValue(selItem, "ORGANIZATION");
      				//console.log(item_facCode,item_roomNum);
      				if (checkAuthz(authz, item_facNum, item_orgCode, null)) {
      					var item_facCode = grid.store.getValue(selItem, "FACILITY_CODE");
      					var item_roomNum = grid.store.getValue(selItem, "ROOM_NUMBER");
      					recordID.push({'FACILITY_CODE':item_facCode,'ROOM_NUMBER':item_roomNum});
      					authzdItems.push(selItem);  //Save item to list of authorized items
      				}
      			});
      			dojo.query('.editSelected-rowTotal',this.content).forEach(function(node, index, arr){
      				node.innerHTML = 'Authorized to edit ' + authzdItems.length + ' of ' + gridSelection.length + ' selected records.';
  					});
  					dojo.query('.editSelected-status',this.content).forEach(function(node, index, arr){
      				node.innerHTML = '';
  					});
    			}
  			})
  		}

  		this["data-geosims-editSelectedDialog"].show();
  	}
  }).placeAt(qTab_resultBC_R_title.containerNode);

  pane.vars.grid_R_titleRowSummaryContainer = dojo.create("span",{"class":"gridTitleRowSummary"},qTab_resultBC_R_title.containerNode);

	pane.vars.queryBox = qTab_queryBox;
	pane.vars.submitQueryButton = submitQueryButton;
	pane.vars.layoutContainer_grids = qTab_resultBC;
	pane.vars.layoutContainer_gridRA = qTab_resultBC_RA;
	populateQueryBox(pane, {from:'R',where:[]});
	pane.vars.previousFrom = 'R'; //Grid layout is set initially as a Room Records query
	pane.grids = {};
	pane.grids.grid_R = new dojox.grid.DataGrid({
		store: store_empty,
		structure: getGridLayout_R(pane),
		pane: pane
	}, document.createElement('div'));
	pane.grids.grid_R.canEdit = checkChildAuthz;
	pane.grids.grid_R.onStartEdit = function(inCell, inRowIndex) {
		if (helpTooltip) helpTooltip.close();
	};
	qTab_resultBC_R_grid.domNode.appendChild(pane.grids.grid_R.domNode);
	pane.grids.grid_R.startup();
	pane.grids.grid_R.evt = {}; //Object to hold dojo.connect handlers

	pane.grids.grid_RA = new dojox.grid.DataGrid({
		store: store_empty,
		structure: getGridLayout_RA(pane),
		pane: pane
	}, document.createElement('div'));
	pane.grids.grid_RA.canEdit = checkChildAuthz;
	pane.grids.grid_RA.onStartEdit = function(inCell, inRowIndex) {
		//console.log('editing cell',inCell,inRowIndex);
		if (helpTooltip) helpTooltip.close();
		if (inCell.declaredClass == "dojox.grid.cells._Widget") {
			inCell.widgetProps.grid = inCell.grid;
			inCell.widgetProps.gridRowIndex = inRowIndex;
		}
	};
	pane.grids.grid_RA.canSort = function(col){ if(Math.abs(col) == 1) { return false; } else { return true; } }; //Disable sorting for 1st column (edit button column)
	qTab_resultBC_RA_grid.domNode.appendChild(pane.grids.grid_RA.domNode);
	pane.grids.grid_RA.startup();
	pane.grids.grid_RA.evt = {}; //Object to hold dojo.connect handlers

	pane.grids.grid_RAB = new dojox.grid.DataGrid({
		store: store_empty,
		structure: getGridLayout_RAB(pane),
		pane: pane
	}, document.createElement('div'));
	pane.grids.grid_RAB.canEdit = function() {return false};
	pane.grids.grid_RAB.onStartEdit = function(inCell, inRowIndex) {
		if (helpTooltip) helpTooltip.close();
		if (inCell.declaredClass == "dojox.grid.cells._Widget" && inCell.widgetProps.store) {
			inCell.widgetProps.store.RA_field = inCell.field;
			inCell.widgetProps.store.RA_grid = inCell.grid;
			inCell.widgetProps.store.RA_item = inCell.widgetProps.store.RA_grid.getItem(inRowIndex);
		}
	};
	pane.grids.grid_RAB.canSort = function(col){ if(Math.abs(col) == 1) { return false; } else { return true; } }; //Disable sorting for 1st column (edit button column)
	qTab_resultBC_RAchild_RAB_grid.domNode.appendChild(pane.grids.grid_RAB.domNode);
	pane.grids.grid_RAB.startup();
	pane.grids.grid_RAB.evt = {}; //Object to hold dojo.connect handlers

	pane.grids.grid_RAO = new dojox.grid.DataGrid({
		store: store_empty,
		structure: getGridLayout_RAO(pane),
		pane: pane
	}, document.createElement('div'));
	pane.grids.grid_RAO.canEdit = function() {return false};
	pane.grids.grid_RAO.onStartEdit = function(inCell, inRowIndex) {
		if (helpTooltip) helpTooltip.close();
	};
	pane.grids.grid_RAO.canSort = function(col){ if(Math.abs(col) == 1) { return false; } else { return true; } }; //Disable sorting for 1st column (edit button column)
	qTab_resultBC_RAchild_RAO_grid.domNode.appendChild(pane.grids.grid_RAO.domNode);
	pane.grids.grid_RAO.startup();
	pane.grids.grid_RAO.evt = {}; //Object to hold dojo.connect handlers

	pane.grids.grid_RAU = new dojox.grid.DataGrid({
		store: store_empty,
		structure: getGridLayout_RAU(pane),
		pane: pane
	}, document.createElement('div'));
	pane.grids.grid_RAU.canEdit = function() {return false};
	pane.grids.grid_RAU.onStartEdit = function(inCell, inRowIndex) {
		if (helpTooltip) helpTooltip.close();
	};
	pane.grids.grid_RAU.canSort = function(col){ if(Math.abs(col) == 1) { return false; } else { return true; } }; //Disable sorting for 1st column (edit button column)
	qTab_resultBC_RAchild_RAU_grid.domNode.appendChild(pane.grids.grid_RAU.domNode);
	pane.grids.grid_RAU.startup();
	pane.grids.grid_RAU.evt = {}; //Object to hold dojo.connect handlers

	pane.grids.grid_R.evt.onSetFunction = onSetFunction;
	pane.grids.grid_RA.evt.onSetFunction = onSetFunction;
	pane.grids.grid_RAB.evt.onSetFunction = onSetFunction;
	pane.grids.grid_RAO.evt.onSetFunction = onSetFunction;
	pane.grids.grid_RAU.evt.onSetFunction = onSetFunction;
	pane.grids.grid_R.evt.onDeleteFunction = onDeleteFunction;
	pane.grids.grid_RA.evt.onDeleteFunction = onDeleteFunction;
	pane.grids.grid_RAB.evt.onDeleteFunction = onDeleteFunction;
	pane.grids.grid_RAO.evt.onDeleteFunction = onDeleteFunction;
	pane.grids.grid_RAU.evt.onDeleteFunction = onDeleteFunction;

	pane.grids.grid_R.evt.onSelectedFunction = grid_R_onSelectionChanged;
	pane.grids.grid_RA.evt.onSelectedFunction = grid_RA_onSelectionChanged;

	pane.grids.grid_R.evt.onSelected = dojo.connect(pane.grids.grid_R,"onSelectionChanged",function() {grid_R_onSelectionChanged(pane);});
	pane.grids.grid_RA.evt.onSelected = dojo.connect(pane.grids.grid_RA,"onSelectionChanged",function() {grid_RA_onSelectionChanged(pane);});
}

function newQueryTab_budget(pane) {
	//If user is not authorized to use application, show message
	if (hasAuthz(authz) == false) {
		showNotAuthzd();
		return;
	}
	//Make DOM structure
	var bc = new dijit.layout.BorderContainer({});

	var qTab_queryCP = new dijit.layout.ContentPane({region:'top',style:'height:100px;overflow:auto;',"class":"queryTab_query"});
	var qTab_queryBox = dojo.create("div",{"class":"queryBox"},qTab_queryCP.domNode);
	var qTab_queryEdit = dojo.create("div",{"class":"queryEdit"},qTab_queryCP.domNode);

	var submitQueryButton = new dijit.form.Button({
  	label: "Submit Query",
  	onClick: function() {
  		makeQuery(pane);
  	}
  },dojo.create("div",{"class":"queryButton"},qTab_queryEdit));

	bc.addChild(qTab_queryCP);

	var qTab_resultBC = new dijit.layout.BorderContainer({region:'center',design:'sidebar'});

	var qTab_resultBC_B = new dijit.layout.BorderContainer({region:'center',gutters:false});
	qTab_resultBC_B_title = new dijit.layout.ContentPane({region:'top',style:'height:1.6em;',"class":"gridTitle",content:"Budgets"});
	var qTab_resultBC_B_grid = new dijit.layout.ContentPane({region:'center'});
	qTab_resultBC_B.addChild(qTab_resultBC_B_title);
	qTab_resultBC_B.addChild(qTab_resultBC_B_grid);
	qTab_resultBC.addChild(qTab_resultBC_B);

	var qTab_resultBC_BRA = new dijit.layout.BorderContainer({region:'bottom',style:'height:50%;',splitter:true,gutters:false});
	var qTab_resultBC_BRA_title = new dijit.layout.ContentPane({region:'top',style:'height:1.6em;',"class":"gridTitle",content:"Budget Locations"});
	var qTab_resultBC_BRA_grid = new dijit.layout.ContentPane({region:'center'});
	qTab_resultBC_BRA.addChild(qTab_resultBC_BRA_title);
	qTab_resultBC_BRA.addChild(qTab_resultBC_BRA_grid);
	qTab_resultBC.addChild(qTab_resultBC_BRA);

	bc.addChild(qTab_resultBC);

	pane.set("title","Budget Query (0)");
	pane.set("content",bc);

	pane.vars = {};
	pane.vars.queryType = "Budget";
	pane.vars.queryStores = {};
	pane.vars.queryStores.qStore_facs = new CustomQueryReadStore({url:'common/php/qFacilities.php', requestMethod:'get'}); //Create query store for budgets
	pane.vars.queryStores.qStore_org = new CustomQueryReadStore({url:'common/php/organizations.php', requestMethod:'get'}); //Create query store for organizations
	pane.vars.queryStores.qStore_emp = new CustomQueryReadStore({url:'common/php/employees.php', requestMethod:'get'}); //Create query store for employees
	pane.vars.queryStores.qStore_bdgt = new CustomQueryReadStore({url:'common/php/budgets.php', requestMethod:'get'}); //Create query store for budgets
	pane.vars.queryStores.qStore_priUse = new CustomQueryReadStore({url:'common/php/qPrimaryUse.php', requestMethod:'get'}); //Create query store for primary uses
	pane.vars.queryStores.qStore_spaceCat = new dojo.data.ItemFileReadStore({url:'common/js/data-spaceCategory.json'});
	pane.vars.queryStores.qStore_funcUse = new CustomQueryReadStore({url:'common/php/qFunctionalUse.php', requestMethod:'get'}); //Create query store for func uses
	/**pane.vars.queryStores.new_qStore_BRA_facs = function() {
		pane.vars.queryStores.qStore_BRA_facs = new BRAQueryReadStore({url:'common/php/qBRA.php', requestMethod:'get'}); //Create query store for func uses
		console.log('new store');
		return pane.vars.queryStores.qStore_BRA_facs;
	}**/
	pane.vars.queryStores.qStore_BRA_facs = new BRAQueryReadStore({url:'common/php/qBRA.php', requestMethod:'get'}); //Create query store for facs
	pane.vars.queryStores.qStore_BRA_room = new BRAQueryReadStore({url:'common/php/qBRA.php', requestMethod:'get'}); //Create query store for rooms in selected fac
	pane.vars.queryStores.qStore_BRA_org = new BRAQueryReadStore({url:'common/php/qBRA.php', requestMethod:'get'}); //Create query store for RA orgs in selected room
	pane.vars.queryStores.qStore_BRA_emp = new BRAQueryReadStore({url:'common/php/qBRA.php', requestMethod:'get'}); //Create query store for RA PIs in selected room
	pane.vars.queryStores.qStore_BRA_RA = new BRAQueryReadStore({url:'common/php/qBRA.php', requestMethod:'get'}); //Create query store for RAs in selected room
	pane.vars.formWidgets = {};
	pane.vars.formWidgets.formWdgt_date = function() {return new dijit.form.DateTextBox({name:'value'})};
	pane.vars.formWidgets.formWdgt_filterSelect = function() {
		return new dijit.form.FilteringSelect({
      name: 'value',
      store: store_empty,
      "class": 'queryInput valueSelect',
      searchAttr:"DESCR",
      queryExpr:"*${0}*",
      required:false,
      autoComplete:false,
      highlightMatch:"all",
      labelType:"text",
      searchDelay:500
    });
	}
	pane.vars.funcs = {};
	//onChange function for Room assignment FilteringSelect
	pane.vars.funcs.BRA_RA_onChange = function(newValue) {
		//console.log(["onChange",newValue, this]);
		if (newValue == "") return; //do nothing for empty value change
		var thisWidget = this;
		pane.grids.grid_BRA.vars.lookups["ROOM_ASSIGNMENT"][newValue] = {};
		dojo.forEach(["ASSIGNEE_ORGANIZATION","ORG_NAME","ASSIGNEE_EMPLOYEE_ID","EMPLOYEE_NAME","ASSIGNEE_ROOM_PERCENT"],function(attr, i) {
			//console.log(thisWidget.store.getValue(thisWidget.item, attr));
			var attrVal = thisWidget.store.getValue(thisWidget.item, attr);
			pane.grids.grid_BRA.vars.lookups["ROOM_ASSIGNMENT"][newValue][attr] = attrVal; //Save each value to this column's lookup table for future use
		});
		this.set('value',newValue);
		//this.grid.edit.apply();
		this.focusNode.blur(); //Lose focus on select to submit
	};


	pane.vars.fields = {
		'B.BUDGET_NUMBER':{
			label:'Budget Number',
			valueStore:pane.vars.queryStores.qStore_bdgt,
			formElement:pane.vars.formWidgets.formWdgt_filterSelect,
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		}
    	}
		},
		'B.BUDGET_TYPE':{
			label:'Type',
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		},
    		'>':{
    			label:'>'
    		},
    		'<':{
    			label:'<'
    		}
    	}
		},
		'B.BUDGET_CLASS':{
			label:'Class',
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		},
    		'>':{
    			label:'>'
    		},
    		'<':{
    			label:'<'
    		}
    	}
		},
		'B.BUDGET_STATUS':{
			label:'Status',
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		},
    		'>':{
    			label:'>'
    		},
    		'<':{
    			label:'<'
    		}
    	}
		},
		'B.ORGANIZATION':{
			label:'Organization',
			valueStore:pane.vars.queryStores.qStore_org,
			formElement:pane.vars.formWidgets.formWdgt_filterSelect,
			predicateOptions:
			{
    		'LIKE':{
    			label:'= <span class="queryElement-subtext">(incl. sub-orgs)</span>'
    		},
    		'=':{
    			label:'= <span class="queryElement-subtext">(exact org)</span>'
    		},
    		'NOT LIKE':{
    			label:'NOT = <span class="queryElement-subtext">(incl. sub-orgs)</span>'
    		},
    		'<>':{
    			label:'NOT = <span class="queryElement-subtext">(exact org)</span>'
    		}
    	},
    	valueFormatter: function(value, condition) {
    		if (dojo.indexOf(['LIKE', 'NOT LIKE'],condition) > -1) {
      		value = value.replace(/0*$/g,''); //Remove trailing zeros
      		if (value.length < 9 && value.length%2 == 0) value = value + '0'; //Pad to odd length (org structure: X-XX-XX-XX-XX-X)
      		if (value.length < 10) value = value + '%'; //Add '%' if less org is less than 10 digits
      	}
      	return value;
    	}
		},
		'B.PRINCIPAL_INVESTIGATOR_ID':{
			label:'Principal Investigator',
			valueStore:pane.vars.queryStores.qStore_emp,
			formElement:pane.vars.formWidgets.formWdgt_filterSelect,
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		}
    	}
		},
		'B.GRANT_CONTRACT_NUMBER':{
			label:'Grant Contract Number',
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		}
    	}
		},
		'B.GRANT_CURRENT_PERIOD_BEGIN':{
			label:'Begin Date',
			formElement:pane.vars.formWidgets.formWdgt_date,
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		},
    		'>':{
    			label:'>'
    		},
    		'<':{
    			label:'<'
    		}
    	},
    	valueFormatter: function(value, condition) {
    		return convertDate(value);
    	}
		},
		'B.GRANT_CURRENT_PERIOD_END':{
			label:'End Date',
			formElement:pane.vars.formWidgets.formWdgt_date,
			predicateOptions:
			{
    		'=':{
    			label:'='
    		},
    		'<>':{
    			label:'NOT ='
    		},
    		'>':{
    			label:'>'
    		},
    		'<':{
    			label:'<'
    		}
    	},
    	valueFormatter: function(value, condition) {
    		return convertDate(value);
    	}
		},
		'BUDGET_ERRORS':{
			label:'Budget Errors',
			formElement:function() {return 'none'},
			predicateOptions:'none'
		}
	};

	pane.vars.queryBox = qTab_queryBox;
	pane.vars.submitQueryButton = submitQueryButton;
	pane.vars.layoutContainer_grids = qTab_resultBC;
	pane.vars.layoutContainer_gridRA = qTab_resultBC_BRA;
	populateQueryBox(pane, {from:'B',where:[]});
	pane.vars.previousFrom = 'B'; //Grid layout is set initially as a Room Records query
	pane.grids = {};

	pane.grids.grid_B = new dojox.grid.DataGrid({
		store: store_empty,
		structure: getGridLayout_B(pane),
		pane: pane
	}, document.createElement('div'));
	pane.grids.grid_B.canEdit = function() {return false};
	pane.grids.grid_B.canSort = function(col){ if(Math.abs(col) == 1) { return false; } else { return true; } }; //Disable sorting for 1st column (edit button column)
	qTab_resultBC_B_grid.domNode.appendChild(pane.grids.grid_B.domNode);
	pane.grids.grid_B.startup();
	pane.grids.grid_B.evt = {}; //Object to hold dojo.connect handlers

	pane.grids.grid_BRA = new dojox.grid.DataGrid({
		store: store_empty,
		structure: getGridLayout_BRA(pane),
		pane: pane
	}, document.createElement('div'));
	pane.grids.grid_BRA.canEdit = function(inCell, inRowIndex) {
		/**if (inCell.field == "ROOM_NUMBER") {
			var storeItem = inCell.grid.getItem(inRowIndex);
			var storeItem_facCode = inCell.grid.store.getValue(storeItem, "FACILITY_CODE");
			if (storeItem_facCode === null || storeItem_facCode == '') {
				//postClientMessage({
      	//	text:"Select a Facility.",
      	//	type:"failure"
      	//});
				return false;
			}
		} else if (inCell.field == 'ASSIGNEE_ORGANIZATION' || inCell.field == 'ASSIGNEE_EMPLOYEE_ID') {
			var storeItem = inCell.grid.getItem(inRowIndex);
			var storeItem_facCode = inCell.grid.store.getValue(storeItem, "FACILITY_CODE");
			var storeItem_roomNum = inCell.grid.store.getValue(storeItem, "ROOM_NUMBER");
			if (storeItem_facCode === null || storeItem_facCode == '' || storeItem_roomNum === null || storeItem_roomNum == '') {
				//postClientMessage({
      	//	text:"Select a Facility and Room Number.",
      	//	type:"failure"
      	//});
				return false;
			}
		}**/
		var isAuthd = checkChildAuthz(inCell, inRowIndex)
		//if (isAuthd === true) {
		//	pane.vars.queryStores.new_qStore_BRA_facs();
		//}
		return isAuthd;
	};



	//onStartEdit function for grid_BRA
	pane.grids.grid_BRA.onStartEdit = function(inCell, inRowIndex) {
		//console.log('editing cell',inCell,inRowIndex);

		if (helpTooltip) helpTooltip.close();
		if (inCell.declaredClass == "dojox.grid.cells._Widget" && inCell.widgetProps.store) {
			if (inCell.widget) {
  			//console.log(inCell.widget.id);

  			//Set value to null
  			inCell.widget.set({'displayedValue':null});

  			//Reset onchange functionality
  			inCell.widget.onChange = pane.vars.funcs.BRA_RA_onChange;
			}
			inCell.widgetProps.store.BRA_field = inCell.field;
			inCell.widgetProps.store.BRA_grid = inCell.grid;
			inCell.widgetProps.store.BRA_item = inCell.widgetProps.store.BRA_grid.getItem(inRowIndex);
		}
	};
	pane.grids.grid_BRA.canSort = function(col){ if(Math.abs(col) == 1) { return false; } else { return true; } }; //Disable sorting for 1st column (edit button column)
	qTab_resultBC_BRA_grid.domNode.appendChild(pane.grids.grid_BRA.domNode);
	pane.grids.grid_BRA.startup();
	pane.grids.grid_BRA.vars = {}; //Object to hold custom vars
	pane.grids.grid_BRA.evt = {}; //Object to hold dojo.connect handlers
	pane.grids.grid_BRA.vars.lookups = {}; //Object to hold value lookup tables
	pane.grids.grid_BRA.vars.lookups["ROOM_ASSIGNMENT"] = {}; //Object to hold values for ROOM_ASSIGNMENT column lookups
	pane.grids.grid_B.evt.onSelectedFunction = grid_B_onSelectionChanged;
	pane.grids.grid_BRA.evt.onSetFunction = grid_BRA_onSetFunction;
	pane.grids.grid_BRA.evt.onDeleteFunction = grid_BRA_onDeleteFunction;
	pane.grids.grid_B.evt.onSelected = dojo.connect(pane.grids.grid_B,"onSelectionChanged",function() {grid_B_onSelectionChanged(pane);});
}

//Add a new query tab
function newQueryTab(tabs) {
	//console.log('new tab', tabs);
	//Make DOM structure
	var pane = new dijit.layout.ContentPane({ title:"New Query", closable: true});

	var bc = new dijit.layout.BorderContainer({});

	var cp = new dijit.layout.ContentPane({region:'center',"class":"queryTab_newQuery"});
	var buttonContainer = dojo.create("div",{"class":"buttonContainer","style":"width:600px;border:solid 1px #AAA;background-color:#EEE;margin-left:auto;margin-right:auto;"},cp.containerNode);
	var newQueryContainer_title = dojo.create("div",{"style":"margin:3px;margin-bottom:0;padding:3px;border:solid 1px #CCC;background-color:#FFF;font-size:1.5em;font-style:italic;font-weight:100;text-align:center;","innerHTML":"Select a query type"},buttonContainer);
	var newQueryContainer_space = dojo.create("div",{"class":"buttonContainer","style":"float:left;width:50%;height:100%;"},buttonContainer);
	var newQueryContainer_spaceContainer = dojo.create("div",{"class":"buttonContainer","style":"margin:3px;padding:10px;border:solid 1px #CCC;background-color:#FFF;height:100%;","innerHTML":"Search for rooms and room assignments. Update room, room assignment, room assignment budgets, room assignment occupants, and room assignment functional use data.<p style='font-size:.8em'>Search criteria:<ul style='font-size:.8em'><li>Facility</li><li>Floor</li><li>Room Number</li><li>Square Feet</li><li>Room Type</li><li>Room Organization</li><li>Room Assignment Organization</li><li>Room Assignment P.I.</li><li>Room Assignment Percent</li><li>Budget</li><li>Occupant</li><li>Functional Use</li><li>Functional Use Percent</li></ul></p>"},newQueryContainer_space);
	var newQueryButton_space = new dijit.form.Button({
  	label: "Space Query",
  	"class":"newQueryButton",
  	style:"color:black;font-weight:normal;",
  	onClick: function() {
  		newQueryTab_space(pane);
  	}
  }).placeAt(dojo.create("div",{"style":"padding:10px;text-align:center;"},newQueryContainer_spaceContainer,"first"));
  var newQueryContainer_budget = dojo.create("div",{"class":"buttonContainer","style":"float:right;width:50%;height:100%;"},buttonContainer);
  var newQueryContainer_budgetContainer = dojo.create("div",{"class":"buttonContainer","style":"margin:3px;padding:10px;border:solid 1px #CCC;background-color:#FFF;height:100%;","innerHTML":"Search for budgets. Each budget can be attributed to one or more room assignments and needs one designated primary room assignment.<p style='font-size:.8em'>Search criteria:<ul style='font-size:.8em'><li>Budget</li><li>Status</li><li>Organization</li><li>P.I.</li><li>Grant Contract Number</li><li>Begin Date</li><li>End Date</li></ul></p>"},newQueryContainer_budget);
	var newQueryButton_budget = new dijit.form.Button({
  	label: "Budget Query",
  	"class":"newQueryButton",
  	style:"color:black;font-weight:normal;",
  	onClick: function() {
  		newQueryTab_budget(pane);
  	}
  }).placeAt(dojo.create("div",{"style":"padding:10px;text-align:center;"},newQueryContainer_budgetContainer,"first"));
  var buttonSubcontainer2 = dojo.create("div",{"class":"buttonContainer","style":"clear:left;","innerHTML":""},buttonContainer);
	bc.addChild(cp);

	pane.set("content",bc);
	tabs.addChild(pane,tabs.getChildren().length-1);
	tabs.selectChild(pane);

}

function grid_B_onSelectionChanged(pane) {
	var grid = pane.grids.grid_B;
	var newSelectionIdx = grid.selection.selectedIndex; //Get this selection index
	if (grid.store.oldSelectionIdx != newSelectionIdx) { //Verify this is a new selection
		//console.log('new selection');
		grid.store.oldSelectionIdx = newSelectionIdx; //Save selection index
		var grid_BRA = pane.grids.grid_BRA;
		var selected = grid.selection.getSelected();
		//Clear RA grid datastore
		grid_BRA.noDataMessage = '';
		grid_BRA.setStore(store_empty);
		if (selected.length == 1) {
			var selItem = selected[0];
			var bgtNum = grid.store.getValue(selItem, "BUDGET_NUMBER");
			var bgtFY = grid.store.getValue(selItem, "BienniumYear");

			var getBRA_deferred = submitQuery(dojo.toJson({"BUDGET_NUMBER":bgtNum,"BienniumYear":bgtFY}),"dataviewer/php/getBRA.php");
  		getBRA_deferred.addCallback(function(data) { //callback for RA info query
  			if (data.msg) {
    			postClientMessage({
    				text:data.msg.text,
    				type:data.msg.type
    			});
    			if (data.msg.type == 'failure') {
    				return;
    			}
    		}
				if (grid_BRA) {
        	var store_BRA = new dojo.data.ItemFileWriteStore({
        		data: {
        			items: data.results.roomAssignment
        		}
        	});
        	store_BRA.onSetListener = dojo.connect(store_BRA, "onSet", grid_BRA.evt.onSetFunction);
        	store_BRA.onDeleteListener = dojo.connect(store_BRA, "onDelete", grid_BRA.evt.onDeleteFunction);
        	//store_BRA.onNewListener = dojo.connect(store_BRA, "onNew", onNewFunction); //not needed at this time
        	store_BRA.storeKind = 'BRA'; //Add custom property storeKind
        	store_BRA.storeGrid = grid_BRA; //Add custom property storeGrid
        	store_BRA.bId = data.request; //Room Assignment Identifiers

        	//Check ASTRA authz and enable/disable 'add room assignment' button
          var bgtOrg = grid.store.getValue(selItem, "ORGANIZATION");
          if (checkAuthz(authz, null, bgtOrg, null)) {
          	//Enable Room Assignment 'Add Assignment' button
						//console.log('ROOM AUTHORIZED');
						grid_BRA.layout.cells[0].name = getEditHeader(pane, false);
          } else {
          	//Disable Room Assignment 'Add Assignment' button
						//console.log('ROOM NOT AUTHORIZED');
						grid_BRA.layout.cells[0].name = getEditHeader(pane, true);
          }

        	grid_BRA.noDataMessage = 'No room assignments.';
        	grid_BRA.selection.clear();
        	grid_BRA.setStore(store_BRA);
          //Select first Room Assignment if there are room assignments
  				//if (data.results.roomAssignment.length > 0) {
					//	grid_BRA.selection.addToSelection(0);
					//}
				}
			});
		}
	}
}

function grid_R_onSelectionChanged(pane) {
//pane.grids.grid_R.evt.onSelected = dojo.connect(pane.grids.grid_R,"onSelectionChanged",function(){
	var grid_R = pane.grids.grid_R;
	var newSelectionIdx = grid_R.selection.selectedIndex; //Get this selection index
	//console.log(grid_R.selection);
	//console.log(pane.grids.grid_R.store.oldSelectionIdx,newSelectionIdx);
	if (pane.grids.grid_R.store.oldSelectionIdx != newSelectionIdx) { //Verify this is a new selection
		//console.log('new selection');
		pane.grids.grid_R.store.oldSelectionIdx = newSelectionIdx; //Save selection index
		//if (grid_R.store.isDirty() == false) {
		if (pane.vars.previousFrom == 'R') {
  		var grid_RA = pane.grids.grid_RA;
  		var grid_RAB = pane.grids.grid_RAB;
  		var grid_RAO = pane.grids.grid_RAO;
  		var grid_RAU = pane.grids.grid_RAU;
  		var selected = grid_R.selection.getSelected();
  		//Clear RA grid datastore
  		grid_RA.noDataMessage = '';
  		grid_RA.setStore(store_empty);
  		grid_RAB.noDataMessage = '';
  		grid_RAB.setStore(store_empty); //ROOM ASSIGNMENT BUDGET GRID
  		grid_RAO.noDataMessage = '';
  		grid_RAO.setStore(store_empty); //ROOM ASSIGNMENT OCCUPANT GRID
  		grid_RAU.noDataMessage = '';
      grid_RAU.setStore(store_empty); //ROOM ASSIGNMENT USE GRID

  		if (selected.length == 1) {
  			var selItem = selected[0];
  			var raFac = grid_R.store.getValue(selItem, "FACILITY_CODE");
  			var raFacNum = grid_R.store.getValue(selItem, "FACILITY_NUMBER");
  			var raRm = grid_R.store.getValue(selItem, "ROOM_NUMBER");
				var raRmOrg = grid_R.store.getValue(selItem, "ORGANIZATION");
				var raRmOrgName = grid_R.store.getValue(selItem, "ORG_NAME");

  			grid_RA.noDataMessage = 'Loading..';
  			grid_RA.setStore(store_empty);
  			var getRA_deferred = submitQuery(dojo.toJson({"FACILITY_CODE":raFac,"ROOM_NUMBER":raRm}),"dataviewer/php/getRA.php");
    		getRA_deferred.addCallback(function(data) { //callback for RA info query
    			if (data.msg) {
      			postClientMessage({
      				text:data.msg.text,
      				type:data.msg.type
      			});
      			if (data.msg.type == 'failure') {
      				return;
      			}
      		}
  				if (grid_RA) {
          	var store_RA = new dojo.data.ItemFileWriteStore({
          		data: {
          			items: data.results.roomAssignment
          		}
          	});
          	store_RA.onSetListener = dojo.connect(store_RA, "onSet", grid_RA.evt.onSetFunction);
          	store_RA.onDeleteListener = dojo.connect(store_RA, "onDelete", grid_RA.evt.onDeleteFunction);
          	store_RA.onNewListener = dojo.connect(store_RA, "onNew", onNewFunction);
          	store_RA.storeKind = 'RA'; //Add custom property storeKind
          	store_RA.storeGrid = grid_RA; //Add custom property storeGrid
          	store_RA.raId = data.request; //Room Assignment Identifiers
          	store_RA.raId["FACILITY_NUMBER"] = raFacNum;
						store_RA.roomStore = grid_R.store; //Custom property for the room data store
						store_RA.roomItem = selItem;
						//store_RA.raId["ORGANIZATION"] = raRmOrg;
						//store_RA.raId["ORG_NAME"] = raRmOrgName;
          	//store_RA.oldSelectionIdx = -1;

          	//Check ASTRA authz and enable/disable 'add room assignment' button
            var roomOrg = grid_R.store.getValue(selItem, "ORGANIZATION");
            if (checkAuthz(authz, raFacNum, roomOrg, null)) {
            	//Enable Room Assignment 'Add Assignment' button
  						//console.log('ROOM AUTHORIZED');
  						grid_RA.layout.cells[0].name = getEditHeader(pane, false);
            } else {
            	//Disable Room Assignment 'Add Assignment' button
  						//console.log('ROOM NOT AUTHORIZED');
  						grid_RA.layout.cells[0].name = getEditHeader(pane, true);
            }

          	grid_RA.noDataMessage = 'No room assignments.';
          	grid_RA.selection.clear();
          	grid_RA.setStore(store_RA);
            //Select first Room Assignment if there are room assignments
    				if (data.results.roomAssignment.length > 0) {
  						grid_RA.selection.addToSelection(0);
  					}
  				}
  			});
  		}
  	}
	}
	//Show selection summary in grid title
	var gridSelection = grid_R.selection.getSelected();
	if (gridSelection.length > 1) {
		var sel_count = gridSelection.length;
		var sel_sqft = 0;
		var sel_capacity = 0;
		dojo.forEach(gridSelection,function(selItem){
			//console.log(selItem);
			sel_sqft += grid_R.store.getValue(selItem, "SQUARE_FEET");
			sel_capacity += grid_R.store.getValue(selItem, "CAPACITY");
			pane.vars.grid_R_titleRowSummaryContainer.innerHTML = 'Count: ' + dojo.number.format(sel_count) + '; Square Feet: ' + dojo.number.format(sel_sqft) + '; Capacity: ' + dojo.number.format(sel_capacity);
		});
	} else {
		pane.vars.grid_R_titleRowSummaryContainer.innerHTML = '';
	}
}

function grid_RA_onSelectionChanged(pane) {
//pane.grids.grid_RA.evt.onSelected = dojo.connect(pane.grids.grid_RA,"onSelectionChanged",function(){
	var grid_RA = pane.grids.grid_RA;
	var newSelectionIdx = grid_RA.selection.selectedIndex;
	//console.log('RA selection changed. oldIdx: ' + grid_RA.store.oldSelectionIdx + ' newIdx: ' + newSelectionIdx);
	if (grid_RA.store.oldSelectionIdx != newSelectionIdx) { //Verify this is a new selection
		//console.log('new selection');
		grid_RA.store.oldSelectionIdx = newSelectionIdx; //Save selection index

		var grid_R = pane.grids.grid_R
		var grid_RAB = pane.grids.grid_RAB;
		var grid_RAO = pane.grids.grid_RAO;
		var grid_RAU = pane.grids.grid_RAU;
		//var selected = grid_RA.selection.getSelected();

		//Clear RA subgrid datastores
	  grid_RAB.noDataMessage = '';
		grid_RAB.setStore(store_empty); //ROOM ASSIGNMENT BUDGET GRID
		grid_RAO.noDataMessage = '';
		grid_RAO.setStore(store_empty); //ROOM ASSIGNMENT OCCUPANT GRID
		grid_RAU.noDataMessage = '';
    grid_RAU.setStore(store_empty); //ROOM ASSIGNMENT USE GRID
    var getRoom = pane.vars.previousFrom == 'RA';
  	if (getRoom) {
  		grid_R.noDataMessage = '';
  		grid_R.setStore(store_empty); //ROOM GRID
  	}
  	var selected = grid_RA.selection.getSelected();
		if (selected.length == 1) {
			var selItem = selected[0];
			var raFacNum = grid_RA.store.getValue(selItem, "FACILITY_NUMBER");
			var raFac = grid_RA.store.getValue(selItem, "FACILITY_CODE");
			var raRm = grid_RA.store.getValue(selItem, "ROOM_NUMBER");
			var raOrg = grid_RA.store.getValue(selItem, "ASSIGNEE_ORGANIZATION");
			var raEmp = grid_RA.store.getValue(selItem, "ASSIGNEE_EMPLOYEE_ID");
			var raPer = grid_RA.store.getValue(selItem, "ASSIGNEE_ROOM_PERCENT");
			/**var isInsert = false;
    	if (selected.length == 1) {
    		var selItem = selected[0];
    		isInsert = grid_RA.store.getValue(selItem, "isInsert");
    	}**/
			//console.log(dojo.indexOf([raFac,raRm,raOrg,raEmp],""), grid_RA.store.getValue(selItem, "isInsert"));
			if (dojo.indexOf([raFac,raRm,raOrg,raEmp],"") == -1 && raPer != 0) { //Check if any RA identifiers are empty (this would be a new, unsubmitted room assignment)
				//Clear RA subgrid datastores
    	  grid_RAB.noDataMessage = 'Loading..';
    		grid_RAB.setStore(store_empty); //ROOM ASSIGNMENT BUDGET GRID
    		grid_RAO.noDataMessage = 'Loading..';
    		grid_RAO.setStore(store_empty); //ROOM ASSIGNMENT OCCUPANT GRID
    		grid_RAU.noDataMessage = 'Loading..';
        grid_RAU.setStore(store_empty); //ROOM ASSIGNMENT USE GRID
        if (getRoom) {
      		grid_R.noDataMessage = 'Loading..';
      		grid_R.setStore(store_empty); //ROOM GRID
      	}
  			//Submit request for Room Assignment infos
  			var getRAchild_deferred = submitQuery(dojo.toJson({'getRoom':getRoom,'q':{"FACILITY_CODE":raFac,"ROOM_NUMBER":raRm,"ORGANIZATION":raOrg,"EMPLOYEE_ID":raEmp}}),"dataviewer/php/getRAchild.php");
  			getRAchild_deferred.addCallback(function(data) { //callback for RA info query
  				if (data.msg) {
      			postClientMessage({
      				text:data.msg.text,
      				type:data.msg.type
      			});
      			if (data.msg.type == 'failure') {
      				return;
      			}
      		}
  				data.request["FACILITY_NUMBER"] = raFacNum;
      		//Room
      		if (getRoom && data.results.room && grid_R) {
          	var store_R = new dojo.data.ItemFileWriteStore({
          		data: {
          			items: data.results.room
          		}
          	});
          	store_R.onSetListener = dojo.connect(store_R, "onSet", grid_R.evt.onSetFunction);
          	store_R.onDeleteListener = dojo.connect(store_R, "onDelete", grid_R.evt.onDeleteFunction);
          	//store_R.onNewListener = dojo.connect(store_R, "onNew", onNewFunction);
          	store_R.storeKind = 'R'; //Add custom property storeKind
          	store_R.storeGrid = grid_R; //Add custom property storeGrid
          	store_R.raId = data.request; //Room Assignment Identifiers
          	grid_R.noDataMessage = 'No rooms.';
          	grid_R.selection.clear();
          	grid_R.setStore(store_R);
          }
      		//Room Assignment Occupant
      		if (grid_RAO) {
          	var store_RAO = new dojo.data.ItemFileWriteStore({
          		data: {
          			items: data.results.roomAssignmentOcc
          		}
          	});
          	store_RAO.onSetListener = dojo.connect(store_RAO, "onSet", grid_RAO.evt.onSetFunction);
          	store_RAO.onDeleteListener = dojo.connect(store_RAO, "onDelete", grid_RAO.evt.onDeleteFunction);
          	store_RAO.onNewListener = dojo.connect(store_RAO, "onNew", onNewFunction);
          	store_RAO.storeKind = 'RAO'; //Add custom property storeKind
          	store_RAO.storeGrid = grid_RAO; //Add custom property storeGrid
          	store_RAO.raId = data.request; //Room Assignment Identifiers
          	grid_RAO.noDataMessage = 'No occupants.';
          	grid_RAO.selection.clear();
          	grid_RAO.setStore(store_RAO);
          }
        	//Room Assignment Use
        	if (grid_RAU) {
          	var store_RAU = new dojo.data.ItemFileWriteStore({
          		data: {
          			items: data.results.roomAssignmentUse
          		}
          	});
          	store_RAU.onSetListener = dojo.connect(store_RAU, "onSet", grid_RAU.evt.onSetFunction);
          	store_RAU.onDeleteListener = dojo.connect(store_RAU, "onDelete", grid_RAU.evt.onDeleteFunction);
          	store_RAU.onNewListener = dojo.connect(store_RAU, "onNew", onNewFunction);
          	store_RAU.storeKind = 'RAU';
          	store_RAU.storeGrid = grid_RAU; //Add custom property storeGrid
          	store_RAU.raId = data.request; //Room Assignment Identifiers
          	grid_RAU.noDataMessage = 'No uses.';
          	grid_RAU.selection.clear();
          	grid_RAU.setStore(store_RAU);
        	}
        	//Room Assignment Budget
        	if (grid_RAB) {
          	store_RAB = new dojo.data.ItemFileWriteStore({
          		data: {
          			items: data.results.budget
          		}
          	});
          	store_RAB.onSetListener = dojo.connect(store_RAB, "onSet", grid_RAB.evt.onSetFunction);
          	store_RAB.onDeleteListener = dojo.connect(store_RAB, "onDelete", grid_RAB.evt.onDeleteFunction);
          	store_RAB.onNewListener = dojo.connect(store_RAB, "onNew", onNewFunction);
          	store_RAB.storeKind = 'RAB';
          	store_RAB.storeGrid = grid_RAB; //Add custom property storeGrid
          	store_RAB.raId = data.request; //Room Assignment Identifiers
          	grid_RAB.noDataMessage = 'No budgets.';
          	grid_RAB.selection.clear();
          	grid_RAB.setStore(store_RAB);
          }
          //Check ASTRA authz and allow/disallow editing for grids
          if (getRoom && data.results.room && grid_R) {
          	var roomOrg = grid_R.store.getValue(grid_R.getItem(0), "ORGANIZATION");
          } else {
          	var roomOrg = grid_R.store.getValue(grid_R.selection.getSelected()[0], "ORGANIZATION");
          }

          if (checkAuthz(authz, raFacNum, roomOrg, raOrg)) {
          	//Allow editing and show edit column for grids
          	dojo.forEach([grid_RAO,grid_RAU,grid_RAB], function(grid) {
          		grid.canEdit = function() {return true};
          		grid.layout.setColumnVisibility(0,true);
          	});
          } else {
          	//Disallow editing and hide edit column for grids
          	dojo.forEach([grid_RAO,grid_RAU,grid_RAB], function(grid) {
          		grid.canEdit = function() {
          			postClientMessage({
									text:"Not authorized.",
									type:"failure"
								});
								return false;
							};
          		grid.layout.setColumnVisibility(0,false);
          	});
          }
      	});
      } else {
      	//Hide add/delete column on child tables
      	dojo.forEach([grid_RAO,grid_RAU,grid_RAB], function(grid) {
          grid.layout.setColumnVisibility(0,false);
        });
      }
    } else { //no row is selected
    	//gridRA.selection.addToSelection(0);
    }
  }
}

function getGridLayout_R(pane) {return [
		{
    	onAfterRow: function(rowIndex, subRows, rowNode) {
    		//console.log({'gridType': 'R', 'onAfter' : rowIndex, 'subRows' : subRows});
    	},
    	cells:
    	[
    		{
    			field : "FACDESC",
    			name : "Facility",
    			editable : false,
    			width : "12em"
    		},{
    			field : "FLOOR_CODE",
    			name : "Floor",
    			editable : false,
    			width : "4em",
					formatter : function(val, rowIdx, cell) {
    				//console.log(cell);
						var item = cell.grid.getItem(rowIdx);
						var roomFacNum = cell.grid.store.getValue(item, "FACILITY_NUMBER");

						return '<a href="https://geosims.cpo.uw.edu/geosims/mapviewer.htm#FACNUM=' + roomFacNum + '&FLOOR=' + val + '" target="_blank" class="gridFloorPlanLink" title="Open floor plan">' + val + '</a>';
					}
    		},{
    			field : "ROOM_NUMBER",
    			name : "Room Number",
    			editable : false,
    			width : "5em",
					formatter : function(val, rowIdx, cell) {
    				//console.log(cell);
						var item = cell.grid.getItem(rowIdx);
						var roomFacNum = cell.grid.store.getValue(item, "FACILITY_NUMBER");
						var roomFloor = cell.grid.store.getValue(item, "FLOOR_CODE");

						return '<a href="https://geosims.cpo.uw.edu/geosims/mapviewer.htm#FACNUM=' + roomFacNum + '&FLOOR=' + roomFloor + '&ROOM=' + val + '" target="_blank" class="gridFloorPlanLink" title="Open floor plan">' + val + '</a>';
					}
    		},{
    			field : "SQUARE_FEET",
    			name : "Square Feet",
    			editable : false,
    			width : "4em",
    			formatter : formatterNumber
    		},{
    			field : "ROOM_TYPE",
    			name : "Primary Use",
    			width : "12em",
    			editable : true,
    			type : dojox.grid.cells.Select,
    			options : ["010 - PUBLIC RESTROOM","011 - CUSTODIAL SUPPLY CLOSET","012 - JANITOR ROOM","013 - TRASH ROOM","020 - PUBLIC CIRCULATION","030 - MECHANICAL AREA","031 - ELECTRICAL CLOSET","032 - TELECOMMUNICATIONS","040 - STRUCTURAL AREA","050 - UNASSIGNED AREA","060 - ALTER\/CONVERSION","070 - UNFINISHED AREA","090 - PARKING GARAGE","095 - PRKNG GARAGE SERVICE","110 - GENERAL CLASSROOM","111 - ASSIGNED CLASSROOM","112 - COMPUTER CLASSROOM","115 - CLASSROOM SERVICE","116 - BREAKOUT SPACE","140 - REMOTE CLASSROOM","210 - LAB CLASSROOM","211 - GENERAL CLASS LAB","212 - RESTRICTED CLASS LAB","215 - CLASS LAB SERVICE","220 - OPEN LABORATORY","225 - OPEN LAB SERVICE","230 - COMPUTER LABORATORY","235 - COMPUTER LAB SERVICE","250 - RESEARCH LAB","255 - RESEARCH LAB SERVICE","260 - BL3 WET LAB","261 - COMPUTATION DRY LAB","262 - BL2 WET LAB","264 - SPECIALIZED WET LAB","265 - ANIMAL SURGERY","311 - FACULTY OFFICE\/DESK","312 - DEAN\/CHAIR\/DIR\/OFF","313 - TA\/RA OFFICE\/DESK","314 - CLERICAL OFFICE\/DESK","315 - OFFICE GENERAL SUPT","316 - PROSTAFF OFFICE\/DESK","317 - OTHER SPACE\/DESK","318 - OFFICE STORAGE","319 - CONTRACT EMPLOYEE","350 - CONFERENCE ROOM","355 - CONFERENCE SERVICE","360 - BREAKROOM\/KITCHEN","362 - OFFICE LIBRARY","363 - OFFICE EQUIP ROOM","364 - OFFICE SUPPLY STOR","410 - LIBRARY STUDY ROOM","412 - NON-LIBRARY STUDY RM","420 - LIBRARY COLLECTIONS","430 - OPEN-STACK STUDY RM","440 - PROCESSING ROOM","441 - USER ASSISTANCE","442 - TECHNICAL PROCESSING","455 - STUDY SERVICE","520 - ATHLETIC FACILITIES","523 - ATHLETIC SPCTR SEATS","525 - ATHLETIC FAC SERVICE","530 - MEDIA PRODUCTION","535 - MEDIA PRODUCTION SRV","540 - CLINIC","545 - CLINIC SERVICE","550 - DEMONSTRATION","555 - DEMONSTRATION SERV","560 - TEST\/DEMO FACILITY","570 - ANIMAL QUARTERS","575 - ANIMAL QUARTERS SERV","580 - GREENHOUSE","585 - GREENHOUSE SERVICE","590 - NOT CLASSIFIED","610 - ASSEMBLY","615 - ASSEMBLY SERVICE","620 - EXHIBITION","625 - EXHIBITION SERVICE","630 - FOOD FACILITIES","635 - FOOD FACILITIES SERV","636 - NUTRITION STATIONS","637 - FOOD PREPARATION ARE","638 - FOOD CLEANING AREAS\/","639 - SERVING LINE","640 - DAY CARE","645 - DAY CARE SERVICE","650 - PUBLIC LOUNGE","651 - DEPARTMENTAL LOUNGE","655 - PUBLIC LOUNGE SERV","660 - MERCHANDISING","661 - VENDING AREA","665 - MERCHANDISING SERV","670 - RECREATION","675 - RECREATION SERV","680 - MEETING ROOM","685 - MEETING","710 - CENTRAL COMPUTER","711 - DEPARTMENT COMPUTER","712 - CENTRAL SECURITY SYS","715 - CNTRL COMPUTER SER","716 - OFFICE COMPUTER SERV","717 - INFRASTRUCT DIST CTR","720 - SHOP","725 - SHOP SERVICE","730 - CENTRAL STORAGE","731 - FURNITURE\/EQUIPMENT ","735 - CENTRAL STORAGE SERV","740 - VEHICLE STORAGE","745 - VEHICLE STORAGE SERV","750 - CENTRAL SERVICE","755 - CENTRAL SERVICE SERV","760 - HAZARADOUS MATERIALS","765 - HAZMAT SERVICE","810 - PATIENT BEDROOM","815 - PATIENT BEDROOM SERVICE","820 - PATIENT BATH","830 - PATIENT STATION","835 - PATIENT STATION SERVICE","840 - SURGERY","845 - SURGERY SERVICE","850 - TREATMENT\/EXAMINATION CLINIC","855 - TREATMENT\/EXAM CLINIC SERVICE","860 - DIAGONSTIC SERVICE LAB","865 - DIAGONSTIC SERV LAB SUPPORT","870 - CENTRAL SUPPLIES","880 - PUBLIC WAITING","890 - STAFF ON-CALL FACILITY","895 - STAFF ON-CALL FACILITY SERVICE","910 - SLEEP\/STUDY\/WO\/RESTROOM","919 - RESTROOMS\/SHOWERS","920 - SLEEP\/STUDY\/W\/RESTROOM","935 - SLEEP\/STUDY SERVICE","950 - APARTMENT","955 - APARTMENT SERVICE","970 - HOUSE"],
    			values : ["010","011","012","013","020","030","031","032","040","050","060","070","090","095","110","111","112","115","116","140","210","211","212","215","220","225","230","235","250","255","260","261","262","264","265","311","312","313","314","315","316","317","318","319","350","355","360","362","363","364","410","412","420","430","440","441","442","455","520","523","525","530","535","540","545","550","555","560","570","575","580","585","590","610","615","620","625","630","635","636","637","638","639","640","645","650","651","655","660","661","665","670","675","680","685","710","711","712","715","716","717","720","725","730","731","735","740","745","750","755","760","765","810","815","820","830","835","840","845","850","855","860","865","870","880","890","895","910","919","920","935","950","955","970"],
    			formatter : function(val, rowIdx, cell) {
    				//console.log(cell);
    				if (val === null || val == '' || val == '590') {
    					cell.customClasses.push('nullErrorClass');
    				}
    				var valIdx = dojo.indexOf(cell.values, val);
    				if (cell.options[valIdx]) {
    					var valLabel = cell.options[valIdx];
    				}

          	var helpWidget = new CustomGridCellHelp({
          		label:valLabel,
          		helpClass:cell.field,
          		helpValue:val,
          		tooltip:helpTooltip
          	});

          	return (helpWidget ? helpWidget : valLabel);
    			}
    		},{
    			field : "ORGANIZATION",
    			name : "Organization",
    			width : "12em",
    			editable : true,
    			type : dojox.grid.cells._Widget,
    			widgetClass: CustomFilteringSelect,
    			widgetProps: {
            store:pane.vars.queryStores.qStore_org,
            gridStoreType:'R',
            grid: function() {
          		return pane.grids.grid_R;
          	},
            searchAttr:"DESCR",
            queryExpr:"*${0}*",
            autoComplete:true,
            //required: false,
            highlightMatch:"all",
            labelType:"text",
            searchDelay:500,
            onChange: function(newValue) {
      				//console.log(["onChange",newValue, this]);
      				/*var orgName = this.displayedValue.split(' - ')[1];
      				gridRoom_store.idNameVals = {
      					idVal:newValue,
      					nameVal:orgName,
      					attrVal:"ORG_NAME"
      				};*/
      				this.set('value',newValue);
							this.grid().edit.apply();
      				this.focusNode.blur(); //Lose focus on select to submit
							this.set('value','');
      			}
    			},
    			formatter : function(val, rowIdx, cell) {
    				//console.log([val,rowIdx,cell,this]);
    				if (val === null || val == '' || val.substr(0,7) == 'UNKNOWN') {
    					cell.customClasses.push('nullErrorClass');
    				}
    				var descVal = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "ORG_NAME");
    				return (descVal ? val + ' - ' + descVal : val);
    			}
    		},{
    			field : "CAPACITY",
    			name : "Capacity",
    			width : "4.5em",
    			editable : true,
    			formatter : formatterNumber
    		},{
    			field : "CONFIRM_DATE",
    			name : "Last Confirmed",
    			width : "9em",
    			editable : false,
    			formatter : function(val, rowIdx, cell) {
    				//console.log([val,rowIdx,cell,this]);
    				//if (val === null || val == '') {
    					//cell.customClasses.push('nullErrorClass');
    				//}
    				var confirmDate = val;
    				var confirmUser = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "CONFIRM_USER");
    				//return (confirmUser ? confirmDate + ', by ' + confirmUser : confirmDate);
    				if (confirmDate === null) {
  						var confirmDate = 'Unconfirmed';
  						//var dialogContent = 'Confirmed correct: <span class="fontBold">' + confirmDate + '</span>';
  						var dialogContent = dojo.create("div",{innerHTML:'Confirmed correct: <span class="confirmDate fontBold">' + confirmDate + '</span><span class="confirmUserContainer" style="display:none"> by <span class="confirmUser fontBold">' + confirmUser + '</span></span>'},null);
  					} else {
    					//var dialogContent = 'Confirmed correct: <span class="fontBold">' + confirmDate + '</span> by <span class="fontBold">' + confirmUser + '</span>';
    					var dialogContent = dojo.create("div",{innerHTML:'Confirmed correct: <span class="confirmDate fontBold">' + confirmDate + '</span><span class="confirmUserContainer"> by <span class="confirmUser fontBold">' + confirmUser + '</span></span>'},null);
    				}

      			var confirmButtonContainer = dojo.create("div",{},null);
      			dojo.place(confirmButtonContainer,dialogContent,"last");
      			var confirmContainer = dojo.create("div",{innerHTML: '<span class="confirmDate">' + confirmDate + '</span><span class="confirmUserContainer"' + (confirmUser ? '>': 'style="display:none">') + ', by <span class="confirmUser">' + confirmUser + '</span></span>',"class":"confirmText"},null);

            var currButtonDialog = new dijit.TooltipDialog({
          		content: dialogContent
      			});
    				var currButton = new dijit.form.DropDownButton({
              label: confirmDate,
              'class': "confirmButton",
              title: "Last confirmed correct",
              dropDown: currButtonDialog
          	});

          	var confirmButton = new dijit.form.Button({
            	label: "Confirm",
            	"class":"queryButton",
            	onClick: function() {
            		//console.log('click', this, cell);
            		currButton.closeDropDown();
            		var thisRoomFacCode = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "FACILITY_CODE")
      					var thisRoomRoomNum = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "ROOM_NUMBER")
      					var recordID = [{'FACILITY_CODE':thisRoomFacCode,'ROOM_NUMBER':thisRoomRoomNum}];
      					var onCurrentDeferred = submitQuery(dojo.toJson(recordID),"common/php/updateroomconfirm.php");
      					onCurrentDeferred.addCallback(function(data) {

        					if (data.rowsUpdated === 0) {
                		postClientMessage({
        							text:"Not updated.",
        							type:"failure"
        						});
                		return;
                	}

                	postClientMessage({
                		text:"Updated.",
                		type:"success"
                	});

                	//Set new confirm date and user values in data store
                	dojo.disconnect(cell.grid.store.onSetListener);
        					cell.grid.store.setValue(cell.grid.getItem(rowIdx), 'CONFIRM_DATE', data.value['CONFIRM_DATE']);
        					cell.grid.store.setValue(cell.grid.getItem(rowIdx), 'CONFIRM_USER', data.value['CONFIRM_USER']);
        					cell.grid.store.save();
        					cell.grid.store.onSetListener = dojo.connect(cell.grid.store, "onSet", cell.grid.evt.onSetFunction);

        					//Update date and user values in html
      						currButton.set('label',data.value['CONFIRM_DATE']);
      						dojo.forEach([dialogContent,confirmContainer],function(container) {
        						dojo.query(".confirmDate",container).forEach(function(node, index, arr){
        							node.innerHTML = data.value['CONFIRM_DATE'];
        						});
        						dojo.query(".confirmUser",container).forEach(function(node, index, arr){
        							node.innerHTML = data.value['CONFIRM_USER'];
        						});
        						dojo.query(".confirmUserContainer",container).forEach(function(node, index, arr){
        							dojo.style(node,"display","");
        						});
        					});
      					});
      					onCurrentDeferred.addErrback(function(data) {
      						postClientMessage({
      							text:"Not updated.",
      							type:"failure"
      						});
      					});
            	}
            }).placeAt(confirmButtonContainer);
      			var cancelConfirmButton = new dijit.form.Button({
            	label: "Close",
            	"class":"queryButton",
            	onClick: function() {
            		currButton.closeDropDown();
            	}
            }).placeAt(confirmButtonContainer);

          	dojo.place(confirmContainer,currButton.domNode,"last");


          	return currButton;
    			}
    		}
    	]
    }
	]
}

function getEditHeader(pane, disabled) {
	var headerHtml = '<div dojoType="dijit.form.Button" title="Add new record" showLabel="true" ' + (disabled === true ? 'disabled="disabled" ' : '') + 'class="editButton addRow roomChild" onClick="addRow(-1,this.domNode.parentNode.parentNode.id)">+</div>';
	//console.log(headerHtml);
	return headerHtml;
}

function getGridLayout_RA(pane, props) {return [
		{
			onAfterRow: function(rowIndex, subRows, rowNode) {
				dojo.parser.parse(rowNode);
				/**if (rowIndex != -1) {// && typeof this.grid.editButton == "undefined") {
					//if (this.grid.editButton) console.log(this.grid.editButton);
					//console.log({'onAfter' : rowIndex, 'subRows' : subRows, 'rowNode' : rowNode, 'gridView' : this});
					dojo.forEach(subRows, function(subRow) {
						dojo.some(subRow, function(column) {
							//if (column.field == 'EDIT') {
							//	column.grid.editButton = dijit.findWidgets(column.getHeaderNode());
							//	return true;
							//}
							if (column.field == 'DEPT_NOTE') {
								console.log({'onAfter' : rowIndex, 'subRows' : subRows, 'rowNode' : rowNode, 'gridView' : this, 'column' : column});
								if (column.widget) {
									//column.widget(column.widget.domNode, "onresize", function() {console.log('resized');});
									column.widget.grid = column.grid;
									column.widget.rowIndex = rowIndex;
								}
								return true;
							}
						});
					});
				}**/
			},
			cells:[
			{
				field : "EDIT",
				name : getEditHeader(pane,("undefined" != typeof props && "undefined" != typeof props.editHeaderDisabled ? props.editHeaderDisabled : true)),//'<div dojoType="dijit.form.Button" title="Add new record" showLabel="true" disabled="true" class="editButton addRow roomChild" onClick="addRow(-1,this.domNode.parentNode.parentNode.id)">+</div>',
				editable : false,
				width : "28px",
				formatter : formatterEdit
			},{
  			field : "FACDESC",
  			name : "Facility",
  			width : "12em",
  			hidden : true
  		},{
  			field : "ROOM_NUMBER",
  			name : "Room Number",
  			width : "5em",
  			hidden : true
  		},{
				field : "ASSIGNEE_ORGANIZATION",
				name : "Assignment Organization",
				editable : true,
				width : "17em",
				type : dojox.grid.cells._Widget,
				widgetClass: CustomFilteringSelect,
				widgetProps: {
          store:pane.vars.queryStores.qStore_org,
          gridStoreType:'RA',
          searchAttr:"DESCR",
          queryExpr:"*${0}*",
          autoComplete:true,
          highlightMatch:"all",
          labelType:"text",
          searchDelay:500,
          onChange: function(newValue) {
    				//console.log(["onChange",newValue, this]);
    				/**var orgName = this.displayedValue.split(' - ')[1];
    				gridRA_store.idNameVals = {
    					idVal:newValue,
    					nameVal:orgName,
    					attrVal:"ORG_NAME"
    				};**/
    				this.set('value',newValue);
    				this.grid.edit.apply();
    				this.focusNode.blur(); //Lose focus on select to submit
						this.set('value','');
    			}
  			},
				formatter : function(val, rowIdx, cell) {
  				//console.log([val,rowIdx,cell,this]);
					if (val === null || val == '') {
						cell.customClasses.push('nullErrorClass');
					}
					var descVal = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "ORG_NAME");
					return (descVal ? val + ' - ' + descVal : val);
				}
			},{
				field : "ASSIGNEE_EMPLOYEE_ID",
				name : "Principal Investigator",
				editable : true,
				width : "15em",
				type : dojox.grid.cells._Widget,
  			widgetClass: CustomFilteringSelect,
  			widgetProps: {
          store:pane.vars.queryStores.qStore_emp,
          gridStoreType:'RA',
          searchAttr:"DESCR",
          queryExpr:"*${0}*",
          autoComplete:true,
          highlightMatch:"all",
          labelType:"text",
          searchDelay:500,
          onChange: function(newValue) {
    				//console.log(["onChange",newValue, this]);
    				/**var empName = this.displayedValue.split(' - ')[1];
    				gridRA_store.idNameVals = {
    					idVal:newValue,
    					nameVal:empName,
    					attrVal: "EMPLOYEE_NAME"
    				};**/
    				this.set('value',newValue);
						this.grid.edit.apply();
    				this.focusNode.blur(); //Lose focus on select to submit
						this.set('value','');
    			}
  			},
				formatter : function(val, rowIdx, cell) {
  				//console.log([val,rowIdx,cell,this]);
					if (val === null || val == '') {
						cell.customClasses.push('nullErrorClass');
					}
					var descVal = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "EMPLOYEE_NAME");
					return (descVal ? (val == '999999999' ? val + ' - ' + descVal : val + ' - ' + "<a href=\"https://www.washington.edu/home/peopledir/?method=name&length=full&term=" + descVal + "\" title=\"UW Directory\" target=\"_blank\" class=\"gridPersonName\">" + descVal + '</a>') : val);
				}
			},{
				field : "ASSIGNEE_ROOM_PERCENT",
				name : "Room %",
				editable : true,
				width : "4em",
				formatter : formatPercent
			},{
				field : "DEPT_NOTE",
				name : "Notes",
				editable : true,
				width : "15em",
				type : dojox.grid.cells._Widget,
				widgetClass : dijit.form.SimpleTextarea,
				widgetProps : {
					maxLength : 256,
					onMouseUp : function(evt) {
						//console.log(this,pane);
						//Trigger row height change on widget mouse up event
						if (this.grid && this.gridRowIndex) {
							this.grid.rowHeightChanged(this.gridRowIndex);
						}
					}
				}//,
				//formatter : function(val, rowIdx, cell) {
					//console.log(cell);
					//cell.widget.grid = cell.grid;
					//cell.widget.rowIdx = rowIdx;
					//return val;
				//}
			}/**,{type : dojox.grid.cells._Widget,
				field : "OCCUPANTS",
				name : "Occupants",
				editable : false,
				width : "8em",
				formatter : function(val, rowIdx, cell) {
					return val;
				}
			}**/]
		}
	]
}

//Table structure for budget table in budget query
function getGridLayout_B(pane) {return [
		{
			onAfterRow: function(rowIndex, subRows, rowNode) {
				//console.log({'gridType': 'RAB', 'onAfter' : rowIndex, 'subRows' : subRows});
				dojo.parser.parse(rowNode);
			},
			cells:[
			{
				field : "BienniumYear",
				name : "Biennium Year",
				width : "4em"
				//formatter : formatterNumber //formatterNumber won't work now that it adds a comma
			},{
				field : "BUDGET_NUMBER",
				name : "Budget Number",
				width : "12em",
				formatter : function(val, rowIdx, cell) {
  				//console.log([val,rowIdx,cell,this]);
					var descVal = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "BUDGET_NAME");
					return (descVal ? val + ' - ' + descVal : val);
				}
			},{
				field : "BUDGET_TYPE",
				name : "Type",
				width : "4em"
			},{
				field : "BUDGET_CLASS",
				name : "Class",
				width : "4em"
			},{
				field : "BUDGET_STATUS",
				name : "Status",
				width : "4em"
			},{
				field : "PRINCIPAL_INVESTIGATOR_ID",
				name : "Principal Investigator",
				width : "12em",
				formatter : function(val, rowIdx, cell) {
  				//console.log([val,rowIdx,cell,this]);
					var descVal = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "PI_NAME");
					return (descVal ? val + ' - ' + descVal : val);
				}
			},{
				field : "ORGANIZATION",
				name : "Organization",
				width : "12em",
				formatter : function(val, rowIdx, cell) {
  				//console.log([val,rowIdx,cell,this]);
					var descVal = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "ORG_NAME");
					return (descVal ? val + ' - ' + descVal : val);
				}
			},{
				field : "GRANT_CONTRACT_NUMBER",
				name : "Grant Contract Number",
				width : "12em"
			},{
				field : "GRANT_CURRENT_PERIOD_BEGIN",
				name : "Begin Date",
				width : "5em"
			},{
				field : "GRANT_CURRENT_PERIOD_END",
				name : "End Date",
				width : "5em"
			}]
		}
	]
}

//Table structure for room assignment table in budget query
function getGridLayout_BRA(pane, props) {return [
		{
			onAfterRow: function(rowIndex, subRows, rowNode) {
				dojo.parser.parse(rowNode);
			},
			cells:[
			{
				field : "EDIT",
				name : getEditHeader(pane,("undefined" != typeof props && "undefined" != typeof props.editHeaderDisabled ? props.editHeaderDisabled : true)),//'<div dojoType="dijit.form.Button" title="Add new record" showLabel="true" disabled="true" class="editButton addRow roomChild" onClick="addRow(-1,this.domNode.parentNode.parentNode.id)">+</div>',
				editable : false,
				width : "28px",
				formatter : formatterEdit
			},{
  			field : "FACILITY_CODE",
  			name : "Facility",
				editable : true,
  			width : "12em",
				type : dojox.grid.cells._Widget,
				widgetClass: BRAFilteringSelect,
				widgetProps: {
          store:pane.vars.queryStores.qStore_BRA_facs,
          gridStoreType:'BRA',
          grid: function() {
          	return pane.grids.grid_BRA;
          },
          searchAttr:"DESCR",
          queryExpr:"*${0}*",
          autoComplete:true,
          highlightMatch:"all",
          labelType:"text",
          searchDelay:500,
          onChange: function(newValue) {
    				console.log(["onChange",newValue, this]);
    				this.set('value',newValue);
    				if (dojo.isIE) this.grid().edit.apply();
    				this.focusNode.blur(); //Lose focus on select to submit
    			}
  			},
  			formatter : function(val, rowIdx, cell) {
  				//console.log([val,rowIdx,cell,this]);
					if (val === null || val == '') {
						cell.customClasses.push('nullErrorClass');
					}
					var descVal = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "FACDESC");
					return (descVal ? val + ' - ' + descVal : val);
				}
  		},{
  			field : "ROOM_NUMBER",
  			name : "Room",
				editable : true,
  			width : "18em",
				type : dojox.grid.cells._Widget,
				widgetClass: BRAFilteringSelect,
				widgetProps: {
          store:pane.vars.queryStores.qStore_BRA_room,
          gridStoreType:'BRA',
          grid: function() {
          	return pane.grids.grid_BRA;
          },
          searchAttr:"DESCR",
          queryExpr:"*${0}*",
          autoComplete:true,
          highlightMatch:"all",
          labelType:"text",
          searchDelay:500,
          onChange: function(newValue) {
          	console.log(["onChange",newValue, this]);
    				this.set('value',newValue);
    				if (dojo.isIE) this.grid().edit.apply();
    				this.focusNode.blur(); //Lose focus on select to submit
    			}
  			},
  			formatter : function(val, rowIdx, cell) {
  				//console.log([val,rowIdx,cell,this]);
					if (val === null || val == '') {
						cell.customClasses.push('nullErrorClass');
					}
					var facCode = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "FACILITY_CODE");
					var roomDesc = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "ROOMDESC");
					return (facCode ? (roomDesc ? val + ' <span class="BRA-R-info">' + roomDesc + '</span>' : val) : 'Facility required');
				}
  		},{
				field : "ROOM_ASSIGNMENT",
				name : "Room Assignment",
				editable : true,
				width : "42em",
				type : dojox.grid.cells._Widget,
				widgetClass: dijit.form.FilteringSelect,
				widgetProps: {
					store:pane.vars.queryStores.qStore_BRA_RA,
					searchAttr:"DESCR",
          queryExpr:"*${0}*",
          autoComplete:true,
          highlightMatch:"all",
          labelType:"text",
          searchDelay:500,
          selectOnClick:true,
          promptMessage: "Select a room assignment",
          onChange: pane.vars.funcs.BRA_RA_onChange
  			},
				formatter : function(val, rowIdx, cell) {
  				//console.log([val,rowIdx,cell,this]);
					//if (val === null || val == '') {
					//	cell.customClasses.push('nullErrorClass');
					//}
					//var descVal = '<table class="BRA-RA-subtable"><tr><td>Organization:</td><td>' + cell.grid.store.getValue(cell.grid.getItem(rowIdx), "ORGANIZATION") + ' - ' + cell.grid.store.getValue(cell.grid.getItem(rowIdx), "ORG_NAME") + '</td></tr><tr><td>Principal<br/>Investigator:</td><td>' + cell.grid.store.getValue(cell.grid.getItem(rowIdx), "EMPLOYEE_ID") + ' - ' + cell.grid.store.getValue(cell.grid.getItem(rowIdx), "EMPLOYEE_NAME") + '</td></tr></table>';
					var descVal = '<table class="BRA-RA-subtable"><tr class="BRA-RA-subtable-header"><td>Organization</td><td>Principal Investigator</td><td>Room %</td></tr><tr><td>' + cell.grid.store.getValue(cell.grid.getItem(rowIdx), "ORGANIZATION") + (cell.grid.store.getValue(cell.grid.getItem(rowIdx), "ORGANIZATION") == '?' ? '' : ' - ' + cell.grid.store.getValue(cell.grid.getItem(rowIdx), "ORG_NAME")) + '</td><td>' + cell.grid.store.getValue(cell.grid.getItem(rowIdx), "EMPLOYEE_ID") + (cell.grid.store.getValue(cell.grid.getItem(rowIdx), "EMPLOYEE_ID") == '?' ? '' : ' - ' + cell.grid.store.getValue(cell.grid.getItem(rowIdx), "EMPLOYEE_NAME")) + '</td><td>' + cell.grid.store.getValue(cell.grid.getItem(rowIdx), "ASSIGNEE_ROOM_PERCENT") + '%</td></tr></table>';
					var facCode = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "FACILITY_CODE");
					var roomNum = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "ROOM_NUMBER");
					if (facCode) {
						if (roomNum) {
							return descVal
						} else {
							cell.customClasses.push('nullErrorClass');
							return 'Room required';
						}
					} else {
						cell.customClasses.push('nullErrorClass');
						return 'Facility and room required';
					}
				}
			},{
				field : "PRIMARY_ROOM",
				name : "Primary Room",
				width : "4em",
				editable : true,
				type: CustomGridCellBool
			}]
		}
	]
}

function getGridLayout_RAB(pane) {return [
		{
			onAfterRow: function(rowIndex, subRows, rowNode) {
				//console.log({'gridType': 'RAB', 'onAfter' : rowIndex, 'subRows' : subRows});
				dojo.parser.parse(rowNode);
			},
			cells:[
			{
				field : "EDIT",
				name : '<div dojoType="dijit.form.Button" title="Add new record" showLabel="true" class="editButton addRow raChild" onClick="addRow(-1,this.domNode.parentNode.parentNode.id)">+</div>',
				editable : false,
				width : "28px",
				hidden : true,
				formatter : formatterEdit
			},{
				field : "BUDGET_NUMBER",
				name : "Budget Number",
				editable : true,
				width : "10em",
				type : dojox.grid.cells._Widget,
  			widgetClass: CustomFilteringSelect,
  			widgetProps: {
          store:pane.vars.queryStores.qStore_bdgt,
          gridStoreType:'BDGT',
          searchAttr:"DESCR",
          queryExpr:"*${0}*",
          autoComplete:true,
          highlightMatch:"all",
          labelType:"text",
          searchDelay:500,
          onChange: function(newValue) {
    				//console.log(["onChange",newValue, this]);
    				/**var bdgtName = this.displayedValue.split(' - ')[1];
    				gridBdgt_store.idNameVals = {
    					idVal:newValue,
    					nameVal:bdgtName,
    					attrVal: "BUDGET_NAME"
    				};**/
    				this.set('value',newValue);
    				if (dojo.isIE) this.grid.edit.apply();
    				this.focusNode.blur(); //Lose focus on select to submit
						//this.set('value','');
    			}
  			},
				formatter : function(val, rowIdx, cell) {
  				//console.log([val,rowIdx,cell,this]);
					if (val === null || val == '') {
						cell.customClasses.push('nullErrorClass');
					}
					var descVal = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "BUDGET_NAME");
					return (descVal ? val + ' - ' + descVal : val);
				}
			},{
				field : "PRIMARY_ROOM",
				name : "Primary Room",
				width : "4em",
				editable : true,
				type: CustomGridCellBool
			}/**,{
				field : "GRANT_CURRENT_PERIOD_BEGIN",
				name : "Grant Begin",
				width : "4em"
			},{
				field : "GRANT_CURRENT_PERIOD_END",
				name : "Grant End",
				width : "4em"
			}**/]
		}
	]
}

function getGridLayout_RAO(pane) {return [
		{
			onAfterRow: function(rowIndex, subRows, rowNode) {
				//console.log({'gridType': 'RAO', 'onAfter' : rowIndex, 'subRows' : subRows});
				dojo.parser.parse(rowNode);
			},
			cells:[
			{
				field : "EDIT",
				name : '<div dojoType="dijit.form.Button" title="Add new record" showLabel="true" class="editButton addRow raChild" onClick="addRow(-1,this.domNode.parentNode.parentNode.id)">+</div>',
				editable : false,
				width : "28px",
				hidden : true,
				formatter : formatterEdit
			},{
				field : "OCCUPANT_EID",
				name : "EID",
				editable : true,
				width : "auto",
				type : dojox.grid.cells._Widget,
  			widgetClass: CustomFilteringSelect,
  			widgetProps: {
          store:pane.vars.queryStores.qStore_emp,
          gridStoreType:'RAO',
          searchAttr:"DESCR",
          queryExpr:"*${0}*",
          autoComplete:true,
          highlightMatch:"all",
          labelType:"text",
          searchDelay:500,
          onChange: function(newValue) {
    				//console.log(["onChange",newValue, this]);
    				var empName = this.displayedValue.split(' - ')[1];
    				/*gridRAO_store.idNameVals = {
    					idVal:newValue,
    					nameVal:empName,
    					attrVal: "EMPLOYEE_NAME"
    				};*/
    				this.set('value',newValue);
    				if (dojo.isIE) this.grid.edit.apply();
    				this.focusNode.blur(); //Lose focus on select to submit
						//this.set('value','');
    			}
  			},
				formatter : function(val, rowIdx, cell) {
  				//console.log([val,rowIdx,cell,this]);
					if (val === null || val == '') {
						cell.customClasses.push('nullErrorClass');
					}
					var descVal = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "EMPLOYEE_NAME");
					return (descVal ? val + ' - ' + "<a href=\"https://www.washington.edu/home/peopledir/?method=name&length=full&term=" + descVal + "\" title=\"UW Directory\" target=\"_blank\" class=\"gridPersonName\">" + descVal + '</a>': val);
				}
			}]
		}
	]
}

function getGridLayout_RAU(pane) {return [
		{
			onAfterRow: function(rowIndex, subRows, rowNode) {
				//console.log({'gridType': 'RAU', 'onAfter' : rowIndex, 'subRows' : subRows});
				dojo.parser.parse(rowNode);
			},
			cells:[
			{
				field : "EDIT",
				name : '<div dojoType="dijit.form.Button" title="Add new record" showLabel="true" class="editButton addRow raChild" onClick="addRow(-1,this.domNode.parentNode.parentNode.id)">+</div>',
				editable : false,
				width : "28px",
				hidden : true,
				formatter : formatterEdit
			},{
				field : "FUNCTIONAL_USE_CODE",
				name : "Use Type",
				editable : true,
				width : "auto",
				type : dojox.grid.cells.Select,
				//options : ["INST - Instruction","DR - Departmental Research","RSCH - Organized Research","APL - Applied Physics Lab","RPC - Regional Primate Center","SLU - South Lake Union","VESL - Research Vessel Support","OSA - Other Sponsored Activities","PC - Patient Care","OIA - Other Institutional Activities","CRC - Cost or Recharge Center","O&M - Operations and Maintenance","GA - General Administration","CA - College Administration","DA - Department Administration","SPA - Sponsored Project Admin","SSA - Student Services Admin","IA - Instructional Administration","LIB - Libraries","JT - Joint Use","NOvalue - NO value available","UNAS - Unassigned","VAC - Vacant"],
				//values : ["INST","IDR","RSCH","APL","RPC","SLU","VESL","OSA","PC","OIA","CRC","O&M","GA","CA","DA","SPA","SSA","IA","LIB","JT","NOvalue","UNAS","VAC"],
				options : ["GA - General Administration","INST - Instruction","LIB - Libraries","O&M - Operations and Maintenance","OIA - Other Institutional Activities","PC - Patient Care","RSCH - Organized Research","SPA - Sponsored Project Admin.","APL - Applied Physics Lab","OSA - Other Sponsored Activities","RPC - Regional Primate Center","VAC - Vacant","CA - College Administration","DA - Department Administration","SSA - Student Services Admin","UNAS - Unassigned","JT - Joint Use","CRC - Cost or Recharge Center","DR - Departmental Research","SLU - South Lake Union","VESL - Research Vessel Support","NOvalue - NO value available"],
				values : ["GA","INST","LIB","O&M","OIA","PC","RSCH","SPA","APL","OSA","RPC","VAC","CA","DA","SSA","UNAS","JT","CRC","IDR","SLU","VESL","NOvalue"],
				formatter : function(val, rowIdx, cell) {
					var valIdx = dojo.indexOf(cell.values, val.replace(/&amp;/g, "&"));  //Search for value in value list.  Decode any ampersands.
					if (cell.options[valIdx]) {
						var valLabel = cell.options[valIdx];

          	var helpWidget = new CustomGridCellHelp({
          		label:valLabel,
          		helpClass:cell.field,
          		helpValue:val,
          		tooltip:helpTooltip
          	});
        		return (helpWidget ? helpWidget : valLabel);
        	} else {
        		return val;
        	}
        }
			},{
				field : "FUNCTIONAL_USE_PERCENT",
				name : "Use %",
				editable : true,
				width : "3.5em",
				formatter : formatPercent
			}]
		}
	]
}

//Formatter function for creating the edit cell remove row button
function formatterEdit(val, rowIdx, cell) {
	//return '';
	//console.log([this,val,rowIdx,cell]);
	//var editDiv = '<div dojoType="dijit.form.Button" title="Delete this record" showLabel="true" class="editButton deleteRow" onClick="removeRow(' + rowIdx + ',\'' + cell.grid.id + '\')">x</div>';
	var editDiv = new dijit.form.Button({
  	label:"x",
  	"class":"editButton deleteRow",
  	title:"Delete this record",
  	onClick:function() {
  		removeRow(rowIdx, cell.grid);
  	}
  });
	//ASTRA Authz
	if (cell.grid.store.storeKind == 'RA') {
		if (cell.grid.pane.vars.previousFrom == 'RA') {
			var grid = cell.grid.pane.grids.grid_RA;
			var item = grid.getItem(rowIdx);
			var roomOrg = grid.store.getValue(item, "ROOM_ORG");
		} else {

			var grid = cell.grid.pane.grids.grid_R;
			var item = grid.selection.getSelected()[0];
			var roomOrg = grid.store.getValue(item, "ORGANIZATION");
		}
		var roomFacNum = grid.store.getValue(item, "FACILITY_NUMBER");
		var raOrg = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "ORGANIZATION");
		if (!(checkAuthz(authz, roomFacNum, roomOrg, raOrg))) {
  		var editDiv = '';
  	}
  } else if (cell.grid.store.storeKind == 'BRA') {
  	var grid = cell.grid.pane.grids.grid_B;
		var item = grid.selection.getSelected()[0];
		var bgtOrg = grid.store.getValue(item, "ORGANIZATION");
  	var raOrg = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "ORGANIZATION");
  	if (!(checkAuthz(authz, null, bgtOrg, raOrg))) {
  		var editDiv = '';
  	}
  }
	return editDiv;
}

//Formatter function for percentage fields
function formatPercent(val, rowIdx, cell) {
	cell.customClasses.push('alignRight');
	//Get the total of grid percentages
	var grid = cell.grid;
	var gridPercentTotal = 0;
	if (grid.store.storeKind == 'RA') {
		var percentFieldName = 'ASSIGNEE_ROOM_PERCENT';
	} else if (grid.store.storeKind == 'RAU') {
		var percentFieldName = 'FUNCTIONAL_USE_PERCENT';
	}
	//for (var i=0;i<grid.rowCount;i++) {
		//gridPercentTotal += parseInt(grid.store.getValue(grid.getItem(i), percentFieldName));
	//}
	//console.log(grid.store.storeKind, val, gridPercentTotal);
	if (val === null || val == '' || val <= 0 || val > 100/** || gridPercentTotal === NaN || gridPercentTotal < 99 || gridPercentTotal > 100**/) {
		cell.customClasses.push('nullErrorClass');
	}
	return isNaN(val) ? '...' : val + '%';
}

//Check authorizations for RA, RAU, RAO, RAB tables
function checkChildAuthz(inCell, inRowIndex) {
	//console.log(inCell.grid._canEdit, inCell, inRowIndex, authz);
	if (inCell.grid._canEdit == true && inCell.editable) {
		if (inCell.grid.store.storeKind == "R") {
			var roomItem = inCell.grid.getItem(inRowIndex);
			var roomItem_roomOrg = inCell.grid.store.getValue(roomItem, "ORGANIZATION");
			var roomItem_facNum = inCell.grid.store.getValue(roomItem, "FACILITY_NUMBER");
			var isAuthzd = checkAuthz(authz, roomItem_facNum, roomItem_roomOrg, null);
		} else if (inCell.grid.store.storeKind == "BRA") {
			var grid_B = inCell.grid.pane.grids.grid_B; //Get budget grid
			var bItem = grid_B.selection.getSelected()[0]; //Selected budget
			var bItem_org = grid_B.store.getValue(bItem, "ORGANIZATION"); //Budget org
			var bItem_facNum = null; //Don't check facNum authz when dealing with budgets
			var grid_BRA = inCell.grid.pane.grids.grid_BRA; //Get budget room assignments grid
			var raItem_org = grid_BRA.store.getValue(grid_BRA.getItem(inRowIndex), "ORGANIZATION"); //Get selected item
			var isAuthzd = checkAuthz(authz, bItem_facNum, bItem_org, raItem_org); //Check authz
		} else {
			var grid_RA = inCell.grid.pane.grids.grid_RA;
			var grid_R = inCell.grid.pane.grids.grid_R; //Get budget grid
			var raItem = grid_RA.selection.getSelected()[0];
			var raItem_org = grid_RA.store.getValue(raItem, "ASSIGNEE_ORGANIZATION");
			var raItem_facNum = grid_RA.store.getValue(raItem, "FACILITY_NUMBER");
			if (raItem.ROOM_ORG) {
				var raItem_roomOrg = grid_RA.store.getValue(raItem, "ROOM_ORG");
			} else {
				var grid_R = inCell.grid.pane.grids.grid_R;
				var raItem_roomOrg = grid_R.store.getValue(grid_R.selection.getSelected()[0], "ORGANIZATION");
			}
			var isAuthzd = checkAuthz(authz, raItem_facNum, raItem_roomOrg, raItem_org);
		}
		if (isAuthzd) {
			return true;
		} else {
			postClientMessage({
				text:"Not authorized.",
				type:"failure"
			});
		}
	}
	return false;
}

//Function called when a field in a store has been set
function onSetFunction(setitem, attr, oldVal, newVal) {

	//console.log('UPDATED ITEM', setitem, this);
	var store = setitem._S; //var store = this;

	//Disconnect onSelect listener
	if (store.storeGrid.evt && store.storeGrid.evt.onSelected) {
		dojo.disconnect(store.storeGrid.evt.onSelected);
	}

	if (oldVal == newVal) {
		if ("undefined" != typeof store.oldSelectionIdx) {
			store.storeGrid.selection.setSelected(store.oldSelectionIdx, true);
		}
		if (store.storeGrid.evt.onSelected) {
			store.storeGrid.evt.onSelected = dojo.connect(store.storeGrid,"onSelectionChanged",function() {store.storeGrid.evt.onSelectedFunction(store.storeGrid.pane);});
		}
		return false;
	}
	//Update associated name value if ID value is updated/inserted
	if (dojo.indexOf(["ORGANIZATION","ASSIGNEE_ORGANIZATION","EMPLOYEE_ID","ASSIGNEE_EMPLOYEE_ID","OCCUPANT_EID","BUDGET_NUMBER"],attr) > -1) {
		dojo.disconnect(store.onSetListener);
		//Check store's idNameVals attribute for the new name value
		if ((store.idNameVals) && (store.idNameVals.idVal == newVal)) {
  			store.setValue(setitem,store.idNameVals.attrVal,store.idNameVals.nameVal);
  		//} else {
  			//setitem._S.setValue(setitem,store.idNameVals.attrVal,"");
  	} else { //Check query store items for the new name value
			if (attr == "ORGANIZATION" || attr == "ASSIGNEE_ORGANIZATION") {
				var qStore = store.storeGrid.pane.vars.queryStores.qStore_org;
				var descrAttr = 'ORG_NAME';
			} else if (attr == "BUDGET_NUMBER") {
				var qStore = store.storeGrid.pane.vars.queryStores.qStore_bdgt;
				var descrAttr = 'BUDGET_NAME';
				var oldFyVal;
			} else if (attr == "EMPLOYEE_ID" || "ASSIGNEE_EMPLOYEE_ID" || attr == "OCCUPANT_EID") {
				var qStore = store.storeGrid.pane.vars.queryStores.qStore_emp;
				var descrAttr = 'EMPLOYEE_NAME';
			}
			var lookupAttr = qStore.getIdentityAttributes()[0];
			dojo.some(qStore._items,function(item) {
				if (item.i[lookupAttr] == newVal) {
					//console.log('newVal=',item);
					var descrSep = ' - ';
				  var newDescrVal = item.i['DESCR'].substring(item.i['DESCR'].indexOf(descrSep)+descrSep.length);
				  store.setValue(setitem,descrAttr,newDescrVal);
					//store.setValue(setitem,descrAttr,item.i['DESCR'].split(' - ')[1]);
					if (attr == "BUDGET_NUMBER") {
						oldFyVal = store.getValue(setitem,"FISCAL_YEAR_ENTERED"); //Keep old FY value
						var newFyVal = item.i['BienniumYear']
  					store.setValue(setitem,"FISCAL_YEAR_ENTERED",newFyVal);
  				}
					return true;
				}
			});
  	}

		store.onSetListener = dojo.connect(store, "onSet", store.storeGrid.evt.onSetFunction);
	}

	//Test to see if this is a new row
	if (store.getValue(setitem, "FACILITY_CODE") === null && store.getValue(setitem, "ROOM_NUMBER") === null) {
		var failure = false;
		//if (store.storeKind.substr(0,2) != "R") {
  		/**if (store.getValue(setitem, "ORGANIZATION") === null || store.getValue(setitem, "ORGANIZATION") == "") {
  			failure = true;
  			//alert('you must set an organization code');
  		}
  		if (store.getValue(setitem, "EMPLOYEE_ID") === null || store.getValue(setitem, "EMPLOYEE_ID") == "") {
  			failure = true;
  			//alert('you must set an employee id');
  		}**/
  		if (store.storeKind == "RA") {
  			if (store.getValue(setitem, "ASSIGNEE_ORGANIZATION") === null || store.getValue(setitem, "ASSIGNEE_ORGANIZATION") == "") {
    			failure = true;
    			//alert('you must set an organization code');
    		}
    		if (store.getValue(setitem, "ASSIGNEE_EMPLOYEE_ID") === null || store.getValue(setitem, "ASSIGNEE_EMPLOYEE_ID") == "") {
    			failure = true;
    			//alert('you must set an employee id');
    		}
    		if (store.getValue(setitem, "ASSIGNEE_ROOM_PERCENT") === null || store.getValue(setitem, "ASSIGNEE_ROOM_PERCENT") == "" || store.getValue(setitem, "ASSIGNEE_ROOM_PERCENT") == 0) {
    			failure = true;
    			//alert('you must set a room percent');
    		}
    	} else if (store.storeKind == "RAO") {
      	if (store.getValue(setitem, "ORGANIZATION") === null || store.getValue(setitem, "ORGANIZATION") == "") {
    			failure = true;
    			//alert('you must set an organization code');
    		}
    		if (store.getValue(setitem, "EMPLOYEE_ID") === null || store.getValue(setitem, "EMPLOYEE_ID") == "") {
    			failure = true;
    			//alert('you must set an employee id');
    		}
    		if (store.getValue(setitem, "OCCUPANT_EID") === null || store.getValue(setitem, "OCCUPANT_EID") == "") {
    			failure = true;
    			//alert('you must set an occupant eid');
    		}
    	} else if (store.storeKind == "RAU") {
    		if (store.getValue(setitem, "ORGANIZATION") === null || store.getValue(setitem, "ORGANIZATION") == "") {
    			failure = true;
    			//alert('you must set an organization code');
    		}
    		if (store.getValue(setitem, "EMPLOYEE_ID") === null || store.getValue(setitem, "EMPLOYEE_ID") == "") {
    			failure = true;
    			//alert('you must set an employee id');
    		}
    		if (store.getValue(setitem, "FUNCTIONAL_USE_CODE") === null || store.getValue(setitem, "FUNCTIONAL_USE_CODE") == "") {
    			failure = true;
    			//alert('you must set a functional use code');
    		}
    		if (store.getValue(setitem, "FUNCTIONAL_USE_PERCENT") === null || store.getValue(setitem, "FUNCTIONAL_USE_PERCENT") == "" || store.getValue(setitem, "FUNCTIONAL_USE_PERCENT") == 0) {
    			failure = true;
    			//alert('you must set a functional use percent');
    		}
    	} else if (store.storeKind == "RAB") {
    		if (store.getValue(setitem, "ORGANIZATION") === null || store.getValue(setitem, "ORGANIZATION") == "") {
    			failure = true;
    			//alert('you must set an organization code');
    		}
    		if (store.getValue(setitem, "EMPLOYEE_ID") === null || store.getValue(setitem, "EMPLOYEE_ID") == "") {
    			failure = true;
    			//alert('you must set an employee id');
    		}
    		if (store.getValue(setitem, "BUDGET_NUMBER") === null || store.getValue(setitem, "BUDGET_NUMBER") == "") {
    			failure = true;
    			//alert('you must set a budget number');
    		}
    		if (store.getValue(setitem, "PRIMARY_ROOM") === null || store.getValue(setitem, "PRIMARY_ROOM") == "") {
    			failure = true;
    			//alert('you must set a primary room');
    		}
    	}
  	//}
		if (failure) {
			if (store.storeGrid.evt.onSelected) {
			store.storeGrid.evt.onSelected = dojo.connect(store.storeGrid,"onSelectionChanged",function() {store.storeGrid.evt.onSelectedFunction(store.storeGrid.pane);});
		}
			return;
		}

		var insertRecord = {
			recordID:{},
			insert:{}
		};

		//Disconnect the RA grid onSet function, set the new FAC_CODE, RMNO value(s), reconnect the RA grid onSet function
		dojo.disconnect(store.onSetListener);
		store.setValue(setitem, 'FACILITY_CODE', store.raId['FACILITY_CODE']);
		store.setValue(setitem, 'ROOM_NUMBER', store.raId['ROOM_NUMBER']);
		store.onSetListener = dojo.connect(store, "onSet", store.storeGrid.evt.onSetFunction);
		//console.log(setitem);

		insertRecord.recordID['kind'] = store.storeKind;
		insertRecord.insert['FACILITY_CODE'] = store.raId['FACILITY_CODE'];
		insertRecord.insert['ROOM_NUMBER'] = store.raId['ROOM_NUMBER'];
		if (insertRecord.recordID['kind'] == 'RA') {
			//store.storeGrid.evt.onSelected = dojo.connect(store,"onSelectionChanged",function() {grid_RA_onSelectionChanged(store.storeGrid.pane);});
			insertRecord.insert['ASSIGNEE_ORGANIZATION'] = store.getValue(setitem, "ASSIGNEE_ORGANIZATION");
			insertRecord.insert['ASSIGNEE_EMPLOYEE_ID'] = store.getValue(setitem, "ASSIGNEE_EMPLOYEE_ID");
			insertRecord.insert['ASSIGNEE_ROOM_PERCENT'] = store.getValue(setitem, "ASSIGNEE_ROOM_PERCENT");
			insertRecord.insert['DEPT_NOTE'] = store.getValue(setitem, "DEPT_NOTE");
			/**dojo.forEach([gridRAO_store, gridRAU_store, gridBdgt_store],function(store) {
				store.raId = {"FACILITY_CODE":insertRecord.insert['FACILITY_CODE'],
											"ROOM_NUMBER":insertRecord.insert['ROOM_NUMBER'],
											"ORGANIZATION":insertRecord.insert['ORGANIZATION'],
											"EMPLOYEE_ID":insertRecord.insert['EMPLOYEE_ID']}
			});**/
		} else if (insertRecord.recordID['kind'] == 'RAO') {
			insertRecord.insert['ORGANIZATION'] = store.getValue(setitem, "ORGANIZATION");
			insertRecord.insert['EMPLOYEE_ID'] = store.getValue(setitem, "EMPLOYEE_ID");
			insertRecord.insert['OCCUPANT_EID'] = store.getValue(setitem, "OCCUPANT_EID");
		} else if (insertRecord.recordID['kind'] == 'RAU') {
			insertRecord.insert['ORGANIZATION'] = store.getValue(setitem, "ORGANIZATION");
			insertRecord.insert['EMPLOYEE_ID'] = store.getValue(setitem, "EMPLOYEE_ID");
			insertRecord.insert['FUNCTIONAL_USE_CODE'] = store.getValue(setitem, "FUNCTIONAL_USE_CODE");
			insertRecord.insert['FUNCTIONAL_USE_PERCENT'] = store.getValue(setitem, "FUNCTIONAL_USE_PERCENT");
		} else if (insertRecord.recordID['kind'] == 'RAB') {
			insertRecord.insert['ORGANIZATION'] = store.getValue(setitem, "ORGANIZATION");
			insertRecord.insert['EMPLOYEE_ID'] = store.getValue(setitem, "EMPLOYEE_ID");
			insertRecord.insert['FISCAL_YEAR_ENTERED'] = store.getValue(setitem, "FISCAL_YEAR_ENTERED");
			insertRecord.insert['BUDGET_NUMBER'] = store.getValue(setitem, "BUDGET_NUMBER");
			insertRecord.insert['PRIMARY_ROOM'] = store.getValue(setitem, "PRIMARY_ROOM");
		}

		var onInsertDeferred = submitQuery(dojo.toJson({"insertRecord":insertRecord}),"common/php/insertroominfo.php");
		onInsertDeferred.addCallback(function(data) {

				//grid_RA.store.oldSelectionIdx =
				//store.storeGrid.evt.onSelected = dojo.connect(store,"onSelectionChanged",function() {grid_RA_onSelectionChanged(store.storeGrid.pane);});
			//}
			dojo.disconnect(store.onSetListener);
			store.setValue(setitem, "isInsert", false);
			store.onSetListener = dojo.connect(store, "onSet", store.storeGrid.evt.onSetFunction);
			crudCallback(store.storeGrid.pane.grids, data, insertRecord);
			if (insertRecord.recordID['kind'] == 'RA') {
  			var selectIndex = store.storeGrid.store.oldSelectionIdx;
  			store.oldSelectionIdx = -1;
  			store.storeGrid.evt.onSelected = dojo.connect(store.storeGrid,"onSelectionChanged",function() {grid_RA_onSelectionChanged(store.storeGrid.pane);});
  			store.storeGrid.selection.setSelected(selectIndex, true);
  		}
		});
		onInsertDeferred.addErrback(function(data) {
			crudErrorback(store.storeGrid.pane.grids, insertRecord.recordID['kind']);
		});

		return;

	}


	jsonVal = {
		updateRecord:{
			recordID:{},
			update:{}
		}
	};
	//Populate record ID keys
	jsonVal.updateRecord.recordID['kind'] = store.storeKind;
	jsonVal.updateRecord.recordID['FACILITY_CODE'] = store.getValue(setitem, "FACILITY_CODE");
	jsonVal.updateRecord.recordID['ROOM_NUMBER'] = store.getValue(setitem, "ROOM_NUMBER");
	//if (jsonVal.updateRecord.recordID['kind'] != 'R') { //Add record keys for room assignment and room assignment use
		if (jsonVal.updateRecord.recordID['kind'] == 'RA') {  //Add record keys for room assignment use
			jsonVal.updateRecord.recordID['ASSIGNEE_ORGANIZATION'] = store.getValue(setitem, "ASSIGNEE_ORGANIZATION");
			jsonVal.updateRecord.recordID['ASSIGNEE_EMPLOYEE_ID'] = store.getValue(setitem, "ASSIGNEE_EMPLOYEE_ID");
		} else if (jsonVal.updateRecord.recordID['kind'] == 'RAO') {  //Add record keys for room assignment use
			jsonVal.updateRecord.recordID['ORGANIZATION'] = store.getValue(setitem, "ORGANIZATION");
			jsonVal.updateRecord.recordID['EMPLOYEE_ID'] = store.getValue(setitem, "EMPLOYEE_ID");
			jsonVal.updateRecord.recordID['OCCUPANT_EID'] = store.getValue(setitem, "OCCUPANT_EID");
		} else if (jsonVal.updateRecord.recordID['kind'] == 'RAU') {  //Add record keys for room assignment use
			jsonVal.updateRecord.recordID['ORGANIZATION'] = store.getValue(setitem, "ORGANIZATION");
			jsonVal.updateRecord.recordID['EMPLOYEE_ID'] = store.getValue(setitem, "EMPLOYEE_ID");
			jsonVal.updateRecord.recordID['FUNCTIONAL_USE_CODE'] = store.getValue(setitem, "FUNCTIONAL_USE_CODE");
		} else if (jsonVal.updateRecord.recordID['kind'] == 'RAB') {  //Add record key for budget
			jsonVal.updateRecord.recordID['ORGANIZATION'] = store.getValue(setitem, "ORGANIZATION");
			jsonVal.updateRecord.recordID['EMPLOYEE_ID'] = store.getValue(setitem, "EMPLOYEE_ID");
			jsonVal.updateRecord.recordID['FISCAL_YEAR_ENTERED'] = store.getValue(setitem, "FISCAL_YEAR_ENTERED");
			jsonVal.updateRecord.recordID['BUDGET_NUMBER'] = store.getValue(setitem, "BUDGET_NUMBER");
		}
	//}
	//If a record ID key is updated, set the key value to the old value
	if (attr in jsonVal.updateRecord.recordID) {
		//console.log('RA attr: ',jsonVal.updateRecord.recordID);
		jsonVal.updateRecord.recordID[attr] = oldVal
		//Check if record is a Room Assignment record, and update associated Room Assignment Use(s) in the *grid store*. NOTE: Server scripts will update RAUs in the database, this functionality is not controlled on the client
		if (jsonVal.updateRecord.recordID['kind'] == 'RA') {
  		if (attr == 'ASSIGNEE_ORGANIZATION') {
  				var childKeyAttr = 'ORGANIZATION';
  			} else if (attr == 'ASSIGNEE_EMPLOYEE_ID') {
  				var childKeyAttr = 'EMPLOYEE_ID';
  			} else {
  				var childKeyAttr = attr;
  			}
			dojo.forEach([store.storeGrid.pane.grids.grid_RAO.store, store.storeGrid.pane.grids.grid_RAO.store, store.storeGrid.pane.grids.grid_RAO.store],function(store) {
				store.raId[childKeyAttr] = newVal;
  			store.fetch({
  				query:{ORGANIZATION:jsonVal.updateRecord.recordID['ASSIGNEE_ORGANIZATION'],EMPLOYEE_ID:jsonVal.updateRecord.recordID['ASSIGNEE_EMPLOYEE_ID']},
  				onComplete: function(items,request) {
  					var i;
  					//Disconnect the store onSet function, set the new RA child value(s), reconnect the RA child grid onSet function
  					dojo.disconnect(store.onSetListener);
  					for (i=0; i<items.length; i++) {
  						var item = items[i];
  						store.setValue(item, childKeyAttr, newVal);
  					}
  					store.onSetListener = dojo.connect(store, "onSet", store.storeGrid.evt.onSetFunction);
  				}
  			});
  		});
		}
	}
	//Define attribute and value to update
	jsonVal.updateRecord.update[attr] = newVal;

	//If BUDGET_NUMBER is being updated, also update FISCAL_YEAR_ENTERED
	if (attr == 'BUDGET_NUMBER') {
		jsonVal.updateRecord.update['FISCAL_YEAR_ENTERED'] = jsonVal.updateRecord.recordID['FISCAL_YEAR_ENTERED']; //Add FISCAL_YEAR_ENTERED to update array
		jsonVal.updateRecord.recordID['FISCAL_YEAR_ENTERED'] = oldFyVal; //Set recordID val for FY back to original value
	}

	var onSetDeferred = submitQuery(dojo.toJson({"updateRecord":jsonVal.updateRecord}),"common/php/updateroominfo.php");
	onSetDeferred.addCallback(function(data) {
		crudCallback(store.storeGrid.pane.grids, data, jsonVal.updateRecord);
		if (jsonVal.updateRecord.recordID['kind'] == 'RA') {
			var selectIndex = store.oldSelectionIdx;
			store.storeGrid.selection.setSelected(selectIndex, true);
  		store.storeGrid.evt.onSelected = dojo.connect(store.storeGrid,"onSelectionChanged",function() {grid_RA_onSelectionChanged(store.storeGrid.pane);});
		}
	});
	onSetDeferred.addErrback(function(data) {
		crudErrorback(store.storeGrid.pane.grids, jsonVal.updateRecord.recordID['kind']);
	});
}

function grid_BRA_onSetFunction(setitem, attr, oldVal, newVal) {
	console.log('UPDATED BRA ITEM', setitem, attr, oldVal, newVal, this);
	var store = this;

	//Disconnect onSelect listener
	if (store.storeGrid.evt && store.storeGrid.evt.onSelected) {
		dojo.disconnect(store.storeGrid.evt.onSelected);
	}

	if (oldVal == newVal) {
		if (store.oldSelectionIdx) {
			store.storeGrid.selection.setSelected(store.oldSelectionIdx, true);
		}
		if (store.storeGrid.evt.onSelected) {
			store.storeGrid.evt.onSelected = dojo.connect(store.storeGrid,"onSelectionChanged",function() {store.storeGrid.evt.onSelectedFunction(store.storeGrid.pane);});
		}
		return false;
	}

	if (attr == "FACILITY_CODE") {

	} else if (attr == "ROOM_NUMBER") {

	} else if (attr == "ROOM_ASSIGNMENT") {
		console.log('new val for ROOM_ASSIGNMENT: ' + newVal);
		if (newVal == "" || "undefined" === typeof store.storeGrid.vars.lookups["ROOM_ASSIGNMENT"][newVal]) return false; //Don't accept empty value
		//Disconnect onSet listener

		var newRA = store.storeGrid.vars.lookups["ROOM_ASSIGNMENT"][newVal];
		var oldVals = {};
		oldVals['ORGANIZATION'] = store.getValue(setitem, "ORGANIZATION");
		oldVals['EMPLOYEE_ID'] = store.getValue(setitem, "EMPLOYEE_ID");
		var newVals = {};
		newVals['ORGANIZATION'] = newRA["ASSIGNEE_ORGANIZATION"];
		newVals['EMPLOYEE_ID'] = newRA["ASSIGNEE_EMPLOYEE_ID"];
		//Update local data store
		var newRA = store.storeGrid.vars.lookups["ROOM_ASSIGNMENT"][newVal];
		dojo.disconnect(store.onSetListener);
		store.setValue(setitem, 'ORGANIZATION', newRA["ASSIGNEE_ORGANIZATION"]);
		store.setValue(setitem, 'ORG_NAME', newRA["ORG_NAME"]);
		store.setValue(setitem, 'EMPLOYEE_ID', newRA["ASSIGNEE_EMPLOYEE_ID"]);
		store.setValue(setitem, 'EMPLOYEE_NAME', newRA["EMPLOYEE_NAME"]);
		store.setValue(setitem, 'ASSIGNEE_ROOM_PERCENT', newRA["ASSIGNEE_ROOM_PERCENT"]);
		console.log('item RA values set: ',setitem);
		delete store.storeGrid.vars.lookups["ROOM_ASSIGNMENT"][newVal]; //Remove lookup item once used
		//Reconnect onSet listener
		store.onSetListener = dojo.connect(store, "onSet", store.storeGrid.evt.onSetFunction);
		//Update/insert row in database table blg.rooms_vs_grants, set organization and employee_id
		//return false;
	}

	//Update associated name value if ID value is updated/inserted
	if (dojo.indexOf(["FACILITY_CODE","ROOM_NUMBER","ORGANIZATION","EMPLOYEE_ID","OCCUPANT_EID","BUDGET_NUMBER"],attr) > -1) {
		dojo.disconnect(store.onSetListener);
		//Check store's idNameVals attribute for the new name value
		if ((store.idNameVals) && (store.idNameVals.idVal == newVal)) {
  			store.setValue(setitem,store.idNameVals.attrVal,store.idNameVals.nameVal);
  		//} else {
  			//setitem._S.setValue(setitem,store.idNameVals.attrVal,"");
  	} else { //Check query store items for the new name value
  		var descrSep = ' - ';
			if (attr == "FACILITY_CODE") {
				var qStore = store.storeGrid.pane.vars.queryStores.qStore_BRA_facs;
				var descrAttr = 'FACDESC';
			} else if (attr == "ROOM_NUMBER") {
				var qStore = store.storeGrid.pane.vars.queryStores.qStore_BRA_room;
				var descrAttr = 'ROOMDESC';
				var descrSep = ' ';
			} else if (attr == "ORGANIZATION") {
				var qStore = store.storeGrid.pane.vars.queryStores.qStore_BRA_org;
				var descrAttr = 'ORG_NAME';
			} else if (attr == "BUDGET_NUMBER") {
				var qStore = store.storeGrid.pane.vars.queryStores.qStore_BRA_bdgt;
				var descrAttr = 'BUDGET_NAME';
			} else if (attr == "EMPLOYEE_ID" || attr == "OCCUPANT_EID") {
				var qStore = store.storeGrid.pane.vars.queryStores.qStore_BRA_emp;
				var descrAttr = 'EMPLOYEE_NAME';
			}
			var lookupAttr = qStore.getIdentityAttributes()[0];
			dojo.some(qStore._items,function(item) {
				if (item.i[lookupAttr] == newVal) {
					//console.log('newVal=',item);
				  var newDescrVal = item.i['DESCR'].substring(item.i['DESCR'].indexOf(descrSep)+descrSep.length);
					store.setValue(setitem,descrAttr,newDescrVal);
					return true;
				}
			});
  	}
		store.onSetListener = dojo.connect(store, "onSet", store.storeGrid.evt.onSetFunction);
	}

	//If this is a new record to insert
	if (store.getValue(setitem, "isInsert") == true) {
		if (store.getValue(setitem, "FACILITY_CODE") === null || store.getValue(setitem, "ROOM_NUMBER") === null) {// || store.getValue(setitem, "ORGANIZATION") === null || store.getValue(setitem, "ORGANIZATION") == "" || store.getValue(setitem, "EMPLOYEE_ID") === null || store.getValue(setitem, "EMPLOYEE_ID") == "") {
			//Need all attributes for valid insert
			if (store.storeGrid.evt.onSelected) {
				store.storeGrid.evt.onSelected = dojo.connect(store.storeGrid,"onSelectionChanged",function() {store.storeGrid.evt.onSelectedFunction(store.storeGrid.pane);});
			}
			return;
		}

		//New insert record request
		var insertRecord = {
			recordID:{},
			insert:{}
		};

		insertRecord.recordID['kind'] = store.storeKind;
		insertRecord.insert['FISCAL_YEAR_ENTERED'] = store.getValue(setitem, "FISCAL_YEAR_ENTERED");
		insertRecord.insert['BUDGET_NUMBER'] = store.getValue(setitem, "BUDGET_NUMBER");
		insertRecord.insert['FACILITY_CODE'] = store.getValue(setitem, "FACILITY_CODE");
		insertRecord.insert['ROOM_NUMBER'] = store.getValue(setitem, "ROOM_NUMBER");
		insertRecord.insert['ORGANIZATION'] = store.getValue(setitem, "ORGANIZATION");
		insertRecord.insert['EMPLOYEE_ID'] = store.getValue(setitem, "EMPLOYEE_ID");
		insertRecord.insert['PRIMARY_ROOM'] = store.getValue(setitem, "PRIMARY_ROOM");

		//Submit insert record to database
		var onInsertDeferred = submitQuery(dojo.toJson({"insertRecord":insertRecord}),"common/php/insertroominfo.php");

		dojo.disconnect(store.onSetListener);
		store.setValue(setitem, "isInsert", false); //Change isInsert to false to make sure additional changes are handled as updates
		store.onSetListener = dojo.connect(store, "onSet", store.storeGrid.evt.onSetFunction);

		onInsertDeferred.addCallback(function(data) {
			dojo.disconnect(store.onSetListener);
			//store.setValue(setitem, "isInsert", false); //Remove this row if above 'isInsert' code works as intended
			//Refresh any values that were returned by the server
			if (data.refresh) {
				for (var refreshColumn in data.refresh) {
					//console.log([refreshColumn,data.refresh[refreshColumn]]);
					store.setValue(setitem,refreshColumn,data.refresh[refreshColumn]);
				}
			}
			store.onSetListener = dojo.connect(store, "onSet", store.storeGrid.evt.onSetFunction);
			crudCallback(store.storeGrid.pane.grids, data, insertRecord);
		});
		onInsertDeferred.addErrback(function(data) {
			crudErrorback(store.storeGrid.pane.grids, insertRecord.recordID['kind']);
		});

		return;
	} else {
		//This is an update
		var jsonVal = {
  		updateRecord:{
  			recordID:{},
  			update:{}
  		}
  	};

		jsonVal.updateRecord.recordID['kind'] = store.storeKind;
		jsonVal.updateRecord.recordID['FACILITY_CODE'] = store.getValue(setitem, "FACILITY_CODE");
		jsonVal.updateRecord.recordID['ROOM_NUMBER'] = store.getValue(setitem, "ROOM_NUMBER");
		jsonVal.updateRecord.recordID['ORGANIZATION'] = store.getValue(setitem, "ORGANIZATION");
		jsonVal.updateRecord.recordID['EMPLOYEE_ID'] = store.getValue(setitem, "EMPLOYEE_ID");
		jsonVal.updateRecord.recordID['FISCAL_YEAR_ENTERED'] = store.getValue(setitem, "FISCAL_YEAR_ENTERED");
		jsonVal.updateRecord.recordID['BUDGET_NUMBER'] = store.getValue(setitem, "BUDGET_NUMBER");
		//jsonVal.updateRecord.recordID['FISCAL_YEAR_ENTERED'] = store.getValue(setitem, "FISCAL_YEAR_ENTERED");

		//If a record ID key is updated, set the key value to the old value
  	if (attr in jsonVal.updateRecord.recordID) {
  		//console.log('RA attr: ',jsonVal.updateRecord.recordID);
  		jsonVal.updateRecord.recordID[attr] = oldVal
  	}

  	//Define attribute and value to update
  	jsonVal.updateRecord.update[attr] = newVal;

  	if (attr == 'ROOM_ASSIGNMENT') {
  		jsonVal.updateRecord.recordID['ORGANIZATION'] = oldVals['ORGANIZATION'];
			jsonVal.updateRecord.recordID['EMPLOYEE_ID'] = oldVals['EMPLOYEE_ID'];
			jsonVal.updateRecord.update = newVals;
  	}

  	var onSetDeferred = submitQuery(dojo.toJson({"updateRecord":jsonVal.updateRecord}),"common/php/updateroominfo.php");
  	onSetDeferred.addCallback(function(data) {
  		dojo.disconnect(store.onSetListener);
			//Refresh any values that were returned by the server
			if (data.refresh) {
				for (var refreshColumn in data.refresh) {
					//console.log([refreshColumn,data.refresh[refreshColumn]]);
					store.setValue(setitem,refreshColumn,data.refresh[refreshColumn]);
				}
			}
			store.onSetListener = dojo.connect(store, "onSet", store.storeGrid.evt.onSetFunction);
			crudCallback(store.storeGrid.pane.grids, data, jsonVal.updateRecord);
  	});
  	onSetDeferred.addErrback(function(data) {
  		crudErrorback(store.storeGrid.pane.grids, jsonVal.updateRecord.recordID['kind']);
  	});
	}
}

//Function called when a row in a store has been deleted
function onDeleteFunction(deletedItem) {
	var store = this;
	if (deletedItem.FACILITY_CODE[0] !== null && deletedItem.ROOM_NUMBER[0] !== null) {
		var deleteRecord = {
			recordID:{},
			deleteRec:{},
			getHistoryString : function() {
				if (this.recordID.kind == 'RA') {
					return this.deleteRec['ASSIGNEE_ORGANIZATION'] + ', ' + this.deleteRec['ASSIGNEE_EMPLOYEE_ID'];
				} else if (this.recordID.kind == 'RAO') {
					return this.deleteRec['OCCUPANT_EID'];
				} else if (this.recordID.kind == 'RAU') {
					return this.deleteRec['FUNCTIONAL_USE_CODE'];
				} else if (this.recordID.kind == 'RAB') {
					return this.deleteRec['BUDGET_NUMBER'];
				} else {
					crudErrorback(store.storeGrid.pane.grids, deleteRecord.recordID['kind']);
					return false;
				}
			}
		}
		deleteRecord.recordID['kind'] = store.storeKind;
		deleteRecord.deleteRec['FACILITY_CODE'] = deletedItem.FACILITY_CODE[0];
		deleteRecord.deleteRec['ROOM_NUMBER'] = deletedItem.ROOM_NUMBER[0];
		//if (deleteRecord.recordID['kind'] != 'R') { //Add record keys for room assignment and room assignment use
			if (deleteRecord.recordID['kind'] == 'RA') {  //Add record keys for room assignment
				deleteRecord.deleteRec['ASSIGNEE_ORGANIZATION'] = deletedItem.ASSIGNEE_ORGANIZATION[0];
				deleteRecord.deleteRec['ASSIGNEE_EMPLOYEE_ID'] = deletedItem.ASSIGNEE_EMPLOYEE_ID[0];
			} else if (deleteRecord.recordID['kind'] == 'RAO') {  //Add record keys for room assignment use
				deleteRecord.deleteRec['ORGANIZATION'] = deletedItem.ORGANIZATION[0];
				deleteRecord.deleteRec['EMPLOYEE_ID'] = deletedItem.EMPLOYEE_ID[0];
				deleteRecord.deleteRec['OCCUPANT_EID'] = deletedItem.OCCUPANT_EID[0];
			} else if (deleteRecord.recordID['kind'] == 'RAU') {  //Add record keys for room assignment use
				deleteRecord.deleteRec['ORGANIZATION'] = deletedItem.ORGANIZATION[0];
				deleteRecord.deleteRec['EMPLOYEE_ID'] = deletedItem.EMPLOYEE_ID[0];
				deleteRecord.deleteRec['FUNCTIONAL_USE_CODE'] = deletedItem.FUNCTIONAL_USE_CODE[0];
			} else if (deleteRecord.recordID['kind'] == 'RAB') {  //Add record key for budget
				deleteRecord.deleteRec['ORGANIZATION'] = deletedItem.ORGANIZATION[0];
				deleteRecord.deleteRec['EMPLOYEE_ID'] = deletedItem.EMPLOYEE_ID[0];
				deleteRecord.deleteRec['FISCAL_YEAR_ENTERED'] = deletedItem.FISCAL_YEAR_ENTERED[0];
				deleteRecord.deleteRec['BUDGET_NUMBER'] = deletedItem.BUDGET_NUMBER[0];
			}
		//}
		var onDeleteDeferred = submitQuery(dojo.toJson({"deleteRecord":deleteRecord}),"common/php/deleteroominfo.php");
		onDeleteDeferred.addCallback(function(data) {
			crudCallback(store.storeGrid.pane.grids, data, deleteRecord);
			//Clear grid selections on successful delete
			var storeKind = deleteRecord.recordID['kind'];
  		if (storeKind == 'RA') {
  			store.storeGrid.selection.clear();
  			dojo.forEach([store.storeGrid.pane.grids.grid_RAO,store.storeGrid.pane.grids.grid_RAU,store.storeGrid.pane.grids.grid_RAB], function(grid) {
        	grid.layout.setColumnVisibility(0,false);
        	grid.selection.clear();
        });
  		} else {
  			store.storeGrid.selection.clear();
  		}
		});
		onDeleteDeferred.addErrback(function(data) {
			crudErrorback(store.storeGrid.pane.grids, deleteRecord.recordID['kind']);
		});
	}
	/**if (store.storeKind == 'RA') {
		dojo.forEach([gridRAO_store, gridRAU_store, gridBdgt_store],function(store) {
  		store.fetch({
  			query:{ORGANIZATION:deletedItem.ORGANIZATION[0],EMPLOYEE_ID:deletedItem.EMPLOYEE_ID[0]},
  			onComplete: function(items,request) {
  				var i;
  				//Disconnect the RAU grid onDelete function, delete the RAU value(s), reconnect the RAU grid onDelete function
  				dojo.disconnect(store.onDeleteListener);
  				for (i=0; i<items.length; i++) {
  					var item = items[i];
  					store.deleteItem(item);
  				}
  				store.onDeleteListener = dojo.connect(store, "onDelete", onDeleteFunction);
  			}
  		});
  	});
	}**/
}

//Function called when a row in a store has been deleted
function grid_BRA_onDeleteFunction(deletedItem) {
	//console.log(deletedItem);
	var store = this;
	//Disconnect onSelect listener
	if (!(deletedItem.isInsert) || deletedItem.isInsert[0] == false) {
		var deleteRecord = {
			recordID:{},
			deleteRec:{}
		}
		deleteRecord.recordID['kind'] = store.storeKind;
		deleteRecord.deleteRec['FACILITY_CODE'] = deletedItem.FACILITY_CODE[0];
		deleteRecord.deleteRec['ROOM_NUMBER'] = deletedItem.ROOM_NUMBER[0];
		deleteRecord.deleteRec['ORGANIZATION'] = deletedItem.ORGANIZATION[0];
		deleteRecord.deleteRec['EMPLOYEE_ID'] = deletedItem.EMPLOYEE_ID[0];
		deleteRecord.deleteRec['FISCAL_YEAR_ENTERED'] = deletedItem.FISCAL_YEAR_ENTERED[0];
		deleteRecord.deleteRec['BUDGET_NUMBER'] = deletedItem.BUDGET_NUMBER[0];

		var onDeleteDeferred = submitQuery(dojo.toJson({"deleteRecord":deleteRecord}),"common/php/deleteroominfo.php");
		onDeleteDeferred.addCallback(function(data) {
			crudCallback(store.storeGrid.pane.grids, data, deleteRecord);
  		store.storeGrid.selection.clear();
		});
		onDeleteDeferred.addErrback(function(data) {
			crudErrorback(store.storeGrid.pane.grids, deleteRecord.recordID['kind']);
		});
	}
}

//Callback for successful database operation (Create, Read, Update, Delete).  Commit changes to client-side data store.
function crudCallback(grids, data, request) {
	var storeKind = request.recordID['kind'];
	//If no rows were updated, handle as error
	if (data.rowsUpdated === 0) {
		crudErrorback(grids, storeKind);
		return;
	}

	if (storeKind == 'R') {
		grids.grid_R.store.save();
		grids.grid_R.selection.setSelected(grids.grid_R.store.oldSelectionIdx, true);
		grids.grid_R.evt.onSelected = dojo.connect(grids.grid_R,"onSelectionChanged",function() {grid_R_onSelectionChanged(grids.grid_R.pane);});
	} else if (storeKind == 'RA') {
		grids.grid_RA.store.save();

		if (grids.grid_RAO.store.isDirty()) {
			grids.grid_RAO.store.save();
		}
		if (grids.grid_RAU.store.isDirty()) {
			grids.grid_RAU.store.save();
		}
		if (grids.grid_RAB.store.isDirty()) {
			grids.grid_RAB.store.save();
		}
	} else if (storeKind == 'RAO') {
		grids.grid_RAO.store.save();
	} else if (storeKind == 'RAU') {
		grids.grid_RAU.store.save();
	} else if (storeKind == 'RAB') {
		grids.grid_RAB.store.save();
	} else if (storeKind == 'BRA') {
		grids.grid_BRA.store.save();
	}

	postClientMessage({
		text:"Updated.",
		type:"success"
	});
}

//Callback for failed database operation (Create, Read, Update, Delete).  Rollback changes to client-side data store.
function crudErrorback(grids, storeKind) {
	if (storeKind == 'R') {
		grids.grid_R.store.revert();
		grids.grid_R.selection.setSelected(grids.grid_R.store.oldSelectionIdx, true);
		grids.grid_R.evt.onSelected = dojo.connect(grids.grid_R,"onSelectionChanged",function() {grid_R_onSelectionChanged(grids.grid_R.pane);});
	} else if (storeKind == 'RA') {
		grids.grid_RA.store.revert();
		grids.grid_RA.selection.setSelected(grids.grid_RA.store.oldSelectionIdx, true);
		grids.grid_RA.evt.onSelected = dojo.connect(grids.grid_RA,"onSelectionChanged",function() {grid_RA_onSelectionChanged(grids.grid_RA.pane);});
		if (grids.grid_RAO.store.isDirty()) {
			grids.grid_RAO.store.revert();
		}
		if (grids.grid_RAU.store.isDirty()) {
			grids.grid_RAU.store.revert();
		}
		if (grids.grid_RAB.store.isDirty()) {
			grids.grid_RAB.store.revert();
		}
	} else if (storeKind == 'RAO') {
		grids.grid_RAO.store.revert();
	} else if (storeKind == 'RAU') {
		grids.grid_RAU.store.revert();
	} else if (storeKind == 'RAB') {
		grids.grid_RAB.store.revert();
	} else if (storeKind == 'BRA') {
		grids.grid_BRA.store.revert();
	}

	postClientMessage({
		text:"Not updated.",
		type:"failure"
	});
}



dojo.ready(init);

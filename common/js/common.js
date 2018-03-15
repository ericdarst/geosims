function submitQuery(dataStr,queryUrl) {
	//The parameters to pass to xhrPost, the message, and the url to send it to
	//Also, how to handle the return and callbacks.  Returns a Deferred dojo object to define additional callbacks later.
	var xhrArgs = {
		url: queryUrl,
		postData: "json=" + encodeURIComponent(dataStr),
		handleAs: "json",
		//preventCache: true,
		timeout: 30000,
		failOk: true,
		error: function(error) {
			console.log('submitQuery error',error);
		}
	};
	//Call the asynchronous xhrPost
	var deferred = dojo.xhrPost(xhrArgs);
	return deferred;
}

function submitQuery_get(content,queryUrl) {
	//The parameters to pass to xhrPost, the message, and the url to send it to
	//Also, how to handle the return and callbacks.  Returns a Deferred dojo object to define additional callbacks later.
	var xhrArgs = {
		url: queryUrl,
		content: content,
		handleAs: "json",
		timeout: 30000,
		error: function(error) {
			console.log(error);
			dojo.byId("info").innerHTML = "Query error.";
		}
	};
	//Call the asynchronous xhrPost
	var deferred = dojo.xhrGet(xhrArgs);
	return deferred;
}

function setCustomClasses() {
	dojo.provide("CustomGridCellHelp");
	dojo.require("dijit._WidgetBase");
	
	dojo.declare("CustomGridCellHelp", [dijit._WidgetBase], {
		//params
		label:'',
		helpClass:'',
		helpValue:'',
		//tooltipLabel: '',
		tooltip: null,
		_helpLabel: ' [*]',
		_helpNode: null,
		
		buildRendering: function(){
			this.domNode = dojo.create("div",{innerHTML: this.label,"class":"itemText"},null);
			this._helpNode = dojo.create("span",{innerHTML: this._helpLabel,"class":"itemHelp","data-sims-helpClass":this.helpClass,"data-sims-helpValue":this.helpValue},this.domNode);
		},
		
		postCreate: function(){
			if (this.tooltip) dojo.connect(this._helpNode, "onclick", this, function(e) {
				//dojo.stopEvent(e);
				this.tooltip.open(this._helpNode);
			});
			//dojo.connect(this, "destroy", function() {console.log('destroy grid cell wdgt', this)});
		}
	});

	dojo.provide("CustomDynamicTooltip");
  dojo.declare("CustomDynamicTooltip", [dijit.Tooltip], {
  	definitions:null,
  	defClassAttr:null,
    defValueAttr:null,
    close: function(){
    	//Disconnect events
    	if (this.onmouseleave_connHandle) {
    		this.disconnect(this.onmouseleave_connHandle);
    		delete this.onmouseleave_connHandle;
    	}
    	if (this.onblur_connHandle) {
    		this.disconnect(this.onblur_connHandle);
    		delete this.onblur_connHandle;
    	}
    	this.inherited("close", arguments);
    },
    
  	open: function(/*DomNode*/ target){
  		if (target) {
  			//Connect events
  			this.onmouseleave_connHandle = this.connect(target, "onmouseleave", "_onTargetMouseLeave");
				this.onblur_connHandle = this.connect(target, "onblur", "_onTargetBlur");
        
				//Set tooltip label
    		if (this.definitions && this.defClassAttr && this.defValueAttr) {
      		var defClass = dojo.attr(target,this.defClassAttr);
      		var defValue = dojo.attr(target,this.defValueAttr);
      		if (this.definitions[defClass] && this.definitions[defClass].values[defValue] && this.definitions[defClass].values[defValue]["definition"] != '') {
      			this.label = '<div class="dataDef-title">' + defValue + ' - ' + this.definitions[defClass].values[defValue]["title"] + '</div><div class="dataDef-def">' + this.definitions[defClass].values[defValue]["definition"] + '</div>';
      		} else {
      			this.label = '<div class="dataDef-title">' + defValue + (this.definitions[defClass] && this.definitions[defClass].values[defValue] ? ' - ' + this.definitions[defClass].values[defValue]["title"] : '') + '</div><div class="dataDef-def">Definition not found.</div>';
      		}
      	} else {
      		this.label = 'Error: Tooltip not defined.';
      	}
  			return this.inherited("open", arguments);
  		}
  	}
	});

	//Modify default FilteringSelect _autoCompleteText function to not update the text node's value until focus is lost
  dojo.provide("CustomFilteringSelect");
  dojo.declare("CustomFilteringSelect", dijit.form.FilteringSelect, {
  	_autoCompleteText:function(text) {
  		console.log('autoCompleteTxt',text);
  		// summary:
			// 		Fill in the textbox with the first item from the drop down
			// 		list, and highlight the characters that were
			// 		auto-completed. For example, if user typed "CA" and the
			// 		drop down list appeared, the textbox would be changed to
			// 		"California" and "ifornia" would be highlighted.

			//var fn = this.focusNode;

			// IE7: clear selection so next highlight works all the time
			//_TextBoxMixin.selectInputText(fn, fn.value.length);
			// does text autoComplete the value in the textbox?
			// text does not autoComplete; replace the whole value and highlight
			//fn.value = text;
			//_TextBoxMixin.selectInputText(fn);

  		//return this.inherited("_autoCompleteText", arguments);  //Default functionality removed
  	},
  	_announceOption:function(node) {
			// summary:
			//		a11y code that puts the highlighted option in the textbox.
			//		This way screen readers will know what is happening in the
			//		menu.
			//this.inherited("_announceOption", arguments);
			//this.focusNode.value = this._lastInput;
			//return;
			//console.log('nononode',node);
			if(!node){
				return;
			}
			// pull the text value from the item attached to the DOM node
			var newValue;
			var oldValue = node.innerHTML;
			if(node == this.dropDown.nextButton ||
				node == this.dropDown.previousButton){
				newValue = node.innerHTML;
				this.item = undefined;
				this.value = '';
			}else{
				//newValue = (this.store._oldAPI ? 	// remove getValue() for 2.0 (old dojo.data API)
				newValue = this.store.getValue(node.item, this.searchAttr);// : node.item[this.searchAttr]).toString();
				this.set('item', node.item, false, newValue);
			}
			
			// get the text that the user manually entered (cut off autocompleted text)
			//this.focusNode.value = this.focusNode.value.substring(0, this._lastInput.length);
			this.focusNode.value = this._lastInput;
			return;
			// set up ARIA activedescendant
			//this.focusNode.setAttribute("aria-activedescendant", domAttr.get(node, "id"));
			// autocomplete the rest of the option to announce change
			//this._autoCompleteText(newValue);
  	}
  });
  
  //Modify default FilteringSelect _autoCompleteText function to not update the text node's value until focus is lost
  dojo.provide("BRAFilteringSelect");
  dojo.declare("BRAFilteringSelect", dijit.form.FilteringSelect, {
  	_autoCompleteText:function(text) {
  		console.log('autoCompleteTxt',text);
  		// summary:
			// 		Fill in the textbox with the first item from the drop down
			// 		list, and highlight the characters that were
			// 		auto-completed. For example, if user typed "CA" and the
			// 		drop down list appeared, the textbox would be changed to
			// 		"California" and "ifornia" would be highlighted.

			//var fn = this.focusNode;

			// IE7: clear selection so next highlight works all the time
			//_TextBoxMixin.selectInputText(fn, fn.value.length);
			// does text autoComplete the value in the textbox?
			// text does not autoComplete; replace the whole value and highlight
			//fn.value = text;
			//_TextBoxMixin.selectInputText(fn);

  		//return this.inherited("_autoCompleteText", arguments);  //Default functionality removed
  	},
  	_announceOption:function(node) {
			// summary:
			//		a11y code that puts the highlighted option in the textbox.
			//		This way screen readers will know what is happening in the
			//		menu.
			//this.inherited("_announceOption", arguments);
			//this.focusNode.value = this._lastInput;
			//return;
			
			if(!node){
				return;
			}
			// pull the text value from the item attached to the DOM node
			var newValue;
			var oldValue = node.innerHTML;
			if(node == this.dropDown.nextButton ||
				node == this.dropDown.previousButton){
				newValue = node.innerHTML;
				this.item = undefined;
				this.value = '';
			}else{
				//newValue = (this.store._oldAPI ? 	// remove getValue() for 2.0 (old dojo.data API)
				newValue = this.store.getValue(node.item, this.searchAttr);// : node.item[this.searchAttr]).toString();
				this.set('item', node.item, false, newValue);
			}
			
			// get the text that the user manually entered (cut off autocompleted text)
			//this.focusNode.value = this.focusNode.value.substring(0, this._lastInput.length);
			this.focusNode.value = this._lastInput;
			return;
			// set up ARIA activedescendant
			//this.focusNode.setAttribute("aria-activedescendant", domAttr.get(node, "id"));
			// autocomplete the rest of the option to announce change
			//this._autoCompleteText(newValue);
  	}
  });
	
	//Modify default QueryReadStore to strip '*' chars from query
  dojo.provide("BRAQueryReadStore");
  dojo.declare("BRAQueryReadStore", dojox.data.QueryReadStore, {
  	fetch:function(request) {
  		console.log('BRAW REQUEST',request, this);
  		if (request.count) { //Kill the autocomplete weirdness
  			var qObj = request.query.DESCR.replace(/^\*\**/, '').replace(/\*\**$/, '');
  			request.serverQuery = {q:qObj,qField:this.BRA_field};
  			//console.log(this.BRA_grid.store.getValue(this.BRA_item, "ROOM_NUMBER"));
  			//console.log(this.BRA_field,this.BRA_item);
  			if (this.BRA_field == 'ROOM_NUMBER') {
  				//console.log(this.BRA_grid.store.getValue(this.BRA_item, "FACILITY_CODE"));
  				request.serverQuery["FACILITY_CODE"] = this.BRA_grid.store.getValue(this.BRA_item, "FACILITY_CODE");
  			} else if (this.BRA_field == 'ORGANIZATION') {
  				//console.log(this.BRA_grid.store.getValue(this.BRA_item, "FACILITY_CODE"));
  				request.serverQuery["FACILITY_CODE"] = this.BRA_grid.store.getValue(this.BRA_item, "FACILITY_CODE");
  				request.serverQuery["ROOM_NUMBER"] = this.BRA_grid.store.getValue(this.BRA_item, "ROOM_NUMBER");
  				request.serverQuery["EMPLOYEE_ID"] = this.BRA_grid.store.getValue(this.BRA_item, "EMPLOYEE_ID");
  			} else if (this.BRA_field == 'EMPLOYEE_ID') {
  				//console.log(this.BRA_grid.store.getValue(this.BRA_item, "FACILITY_CODE"));
  				request.serverQuery["FACILITY_CODE"] = this.BRA_grid.store.getValue(this.BRA_item, "FACILITY_CODE");
  				request.serverQuery["ROOM_NUMBER"] = this.BRA_grid.store.getValue(this.BRA_item, "ROOM_NUMBER");
  				request.serverQuery["ORGANIZATION"] = this.BRA_grid.store.getValue(this.BRA_item, "ORGANIZATION");
  			} else if (this.BRA_field == 'ROOM_ASSIGNMENT') {
  				request.serverQuery["FACILITY_CODE"] = this.BRA_grid.store.getValue(this.BRA_item, "FACILITY_CODE");
  				request.serverQuery["ROOM_NUMBER"] = this.BRA_grid.store.getValue(this.BRA_item, "ROOM_NUMBER");
  			}
  		} else {
  			console.log('No count');
  			return;
  		}
  		//console.log(request);
  		// Call superclass's fetch
  		return this.inherited("fetch", arguments);
  	}
  });
  
	//Modify default QueryReadStore to strip '*' chars from query
  dojo.provide("CustomQueryReadStore");
  dojo.declare("CustomQueryReadStore", dojox.data.QueryReadStore, {
  	fetch:function(request) {
  		console.log('RAW REQUEST',request, this);
  		if (request.query['DESCR']) {
  			request.serverQuery = {q:request.query.DESCR.replace(/^\*\**/, '').replace(/\*\**$/, '')};
  		}
			if (this.RA_field && this.RA_field == 'BUDGET_NUMBER') {
				if (typeof request.serverQuery != 'undefined') {
					request.serverQuery["ORGANIZATION"] = this.RA_grid.store.getValue(this.RA_item, "ORGANIZATION");
					request.serverQuery["EMPLOYEE_ID"] = this.RA_grid.store.getValue(this.RA_item, "EMPLOYEE_ID");
				}
			}

  		//console.log(request);
  		// Call superclass's fetch
  		return this.inherited("fetch", arguments);
  	}
  });



	//Modify default Boolean cell functionality to work with SIMS database Boolean values ('T'/'F');
  dojo.provide("CustomGridCellBool");
  dojo.declare("CustomGridCellBool", dojox.grid.cells.Bool, {
  	formatEditing: function(inDatum, inRowIndex) {
  		// summary:
  		//  modify inDatum and pass to superclass's fetch
  		//console.log([inDatum,inRowIndex]);
  		if (inDatum) {
  			inDatum = (inDatum=="T"); // *Modified to return SIMS database Boolean values ('T'/'F') rather than javascript Boolean values (true/false)
  		}
  		return this.inherited("formatEditing", arguments);
  	},
  	getValue: function(inRowIndex){
			// summary:
			//	returns value entered into editor
			// inRowIndex: int
			// grid row index
			// returns:
			//	value of editor
			// *Modified to return SIMS database Boolean values ('T'/'F') rather than javascript Boolean values (true/false)
  		return (this.getEditNode(inRowIndex)[this._valueProp] ? 'T' : 'F');
  	}
  });
}

function formatterNumber(val, rowIdx, cell) {
	cell.customClasses.push('alignRight');
	val = dojo.number.format(val);
	return val;
}

function convertDate(date) {
	//Check to see if object is a Date. Return the date string, otherwise null.
	return (Object.prototype.toString.call(date) === '[object Date]' ? date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate() : null);
}

function makeAuthzButton(buttonNode) {
	buttonNode = dojo.byId(buttonNode);
	var buttonDialog = new dijit.TooltipDialog({});
  authzButton = new dijit.form.DropDownButton({
  	dropDown: buttonDialog
  });
  buttonNode.appendChild(authzButton.domNode);
  return authzButton;
}

function getAuthz(authzButton, isReload) {
	authzButton.dropDown.set('content','Loading authorizations..');
	authzButton.set('label','<span class="fontBold">Loading..</span>');
	var setAuthzDeferred = submitQuery(dojo.toJson({"reload":isReload}),"common/php/listAuthz.php"); //Get ASTRA authorizations
	setAuthzDeferred.addCallback(function(data) {
		authz = data.authz;
		netid = data.netid;
		var authzExpires = data.expires;

		var dialogContainer = dojo.create("div",{},null);
		
		var authzCount = 0;
		for (var authzItem in authz) {
			authzCount++;
  	}
  	
  	if (authzCount > 0) {
  		dojo.create('span',{'class':'fontBold','innerHTML':'Authorizations'},dialogContainer);
  		var authzList = dojo.create('ul',{},dialogContainer);
  		if ('SuperUser' in authz) {
  			dojo.create('li',{'class':'authzType','innerHTML':'Super User'},authzList);
  		}
  		if ('HMC' in authz) {
  			dojo.create('li',{'class':'authzType','innerHTML':'Harborview User'},authzList);
  		}
  		if ('Cascadia' in authz) {
  			dojo.create('li',{'class':'authzType','innerHTML':'Cascadia User'},authzList);
  		}
  		if ('FacUser' in authz) {
  			dojo.create('li',{'class':'authzType','innerHTML':'Facility User'},authzList);
  			var facChildList = dojo.create('ul',{'class':'authzChildList'},authzList);
  			dojo.forEach(authz.FacUser, function(childAuth) {
  				dojo.create('li',{'class':'authzChild','innerHTML':childAuth[0] + ' - ' + childAuth[1]},facChildList);
  			});
  		}
  		if ('OrgUser' in authz) {
  			dojo.create('li',{'class':'authzType','innerHTML':'Organization Code User'},authzList);
  			var orgChildList = dojo.create('ul',{'class':'authzChildList'},authzList);
  			dojo.forEach(authz.OrgUser, function(childAuth) {
  				dojo.create('li',{'class':'authzChild','innerHTML':childAuth[0] + ' - ' + childAuth[1]},orgChildList);
  			});
  		}
    } else {
  		dojo.create('p',{'innerHTML':'You have no authorizations. Contact <a href=\"mailto:simshelp@uw.edu\">simshelp@uw.edu</a> for assistance.'},dialogContainer);
  	}
		new dijit.form.Button({
  		label: "Reload",
  		"class":"tableEditButton",
  		onClick: function() {
  			getAuthz(authzButton, true);
  		}
  	}).placeAt(dialogContainer);
		
		authzButton.dropDown.set('content',dialogContainer);
		authzButton.set('label','<span class="fontBold">' + netid + '</span>');

		//If user is not authorized to use application, show message
		if (hasAuthz(authz) == false) {
			showNotAuthzd();
		}
	});
	setAuthzDeferred.addErrback(function(data) {
		console.log('AUTHZ ERROR',data);
		var dialogContainer = dojo.create("div",{},null);
		dojo.create('p',{'innerHTML':'Error loading authorizations.'},dialogContainer);
		dojo.create('p',{'innerHTML':data},dialogContainer);
		new dijit.form.Button({
  		label: "Reload",
  		"class":"tableEditButton",
  		onClick: function() {
  			getAuthz(authzButton, true);
  		}
  	}).placeAt(dialogContainer);
  	authzButton.dropDown.set('content',dialogContainer);
  	authzButton.set('label','<span class="fontBold">Error!</span>');
	});
}

function checkAuthz(authz,facNum,ownerOrg,raOrg) {
	//console.log(authz,facNum,ownerOrg,raOrg);
	//Test SuperUser
	if (authz['SuperUser']) {
		//console.log('Authorized: SuperUser');
		return true;
	}
	//Test FacUser
	if (authz['FacUser']) {
		if (dojo.some(authz.FacUser, function(fac) {
			if (fac[0] == facNum) {
				return true;
			}
		})) {
			//console.log('Authorized: FacUser - ' + facNum);
			return true;
		}
	}
	
	//Test organization-based authz
	if (raOrg) {
		var testOrgs = [raOrg, ownerOrg];
	} else {
		var testOrgs = [ownerOrg];
	}
	if (dojo.some(testOrgs, function(testOrg) {
		//console.log(testOrg);
		//Test Cascadia
  	if (authz['Cascadia']) {
  		var cascadiaOrgStub = 'CASCADIA';
  		if (cascadiaOrgStub == testOrg.substr(0,cascadiaOrgStub.length)) {
  			//console.log('Authorized: Cascadia');
  			return true;
  		}
  	}
  	//Test HMC
  	if (authz['HMC']) {
  		var hmcOrgStub = 'HMC';
  		if (hmcOrgStub == testOrg.substr(0,hmcOrgStub.length)) {
  			//console.log('Authorized: HMC');
  			return true;
  		}
  	}
  	//Test OrgUser
  	if (authz['OrgUser']) {
  		if (dojo.some(authz.OrgUser, function(authzOrg) {
				if (authzOrg[0].substr(0,1) === testOrg.substr(0,1) && authzOrg[0].substr(1,9) == 0) {
  				//console.log('Authorized: OrgUser 3 - ' + authzOrg);
  				return true;
  			}
  			if (authzOrg[0].substr(0,3) === testOrg.substr(0,3) && authzOrg[0].substr(3,7) == 0) {
  				//console.log('Authorized: OrgUser 3 - ' + authzOrg);
  				return true;
  			}
				if (authzOrg[0].substr(0,5) === testOrg.substr(0,5) && authzOrg[0].substr(5,5) == 0) {
  				//console.log('Authorized: OrgUser 3 - ' + authzOrg);
  				return true;
  			}
  			if (authzOrg[0].substr(0,7) === testOrg.substr(0,7) && authzOrg[0].substr(7,3) == 0) {
  				//console.log('Authorized: OrgUser 7 - ' + authzOrg);
  				return true;
  			}
  			if (authzOrg[0].substr(0,9) === testOrg.substr(0,9) && authzOrg[0].substr(9,1) == 0) {
  				//console.log('Authorized: OrgUser 9 - ' + authzOrg);
  				return true;
  			}
  			if (authzOrg[0] === testOrg) {
  				//console.log('Authorized: OrgUser 10 - ' + authzOrg);
  				return true;
  			}
  		})) {
  			return true;
  		}
  	}
  })) {
  	return true;
  }
  //console.log('Authorized: None');
	return false;
}

//Check to see if user is authorized to use application
function hasAuthz(authz) {
	//If the user has any authorizations, return true
	var authzCount = 0;
	for (var authzItem in authz) {
		authzCount++;
  }
  
  if (authzCount > 0) {
  	return true;
  } else {
  	return false;
  }
}

function showNotAuthzd() {
	if ("undefined" == typeof notAuthzDialog){
  	notAuthzDialog = new dijit.Dialog({
    	title: "Not Authorized",
    	content: "You are not authorized to view space inventory data. Contact <a href=\"mailto:simshelp@uw.edu\">simshelp@uw.edu</a> for assistance.",
    	style: "width: 400px"
    });
  }
  notAuthzDialog.show();
}

//reload CSS
function css() {
  dojo.query('link[rel="stylesheet"]').forEach(function(node, idx, arr) {
  	if (node.href.indexOf('viewer.css') != -1) {
  		var reloadQueryString = '?reload=' + new Date().getTime();
  		node.href = node.href.replace(/\?.*|$/, reloadQueryString);
  		console.log('CSS reload: SIMS_test.css');
  	}
	});
}


//On new item
function onNewFunction(newItem, parentInfo) {
	//console.log(['new item',newItem,this]);
	onSetFunction(newItem, null, 0, 1);
}

var confirmRemoveRow = true;
//Confirm that the grid row should be removed
function removeRow(rowIdx, theGridId) {
	//console.log([rowIdx, theGridId]);
	if (confirmRemoveRow == true) {
		changeConfirmRemoveRow = false;
		if ("undefined" == typeof confirmRemoveRowDialog){
  		confirmRemoveRowDialog = new dijit.Dialog({
    		title: "Delete this record.",
    		content: "",
    		style: "width: 400px"
    	});
  	}
  	theGridId = dijit.byId(theGridId).id;
  	confirmRemoveRowDialog.set('content',"<div>Are you sure you want to delete this record?</div><div><button onclick='deleteRecord(" + rowIdx + ", \"" + theGridId + "\",changeConfirmRemoveRow);'>Delete</button><button onclick='confirmRemoveRowDialog.hide();'>Cancel</button></div><div>Do not ask again during this session.<input type='checkbox' onclick='changeConfirmRemoveRow = true;'></input></div>");
  	confirmRemoveRowDialog.show();
	} else {
		deleteRecord(rowIdx, theGridId, false);
	}
}

//Remove a row at specified index from given gridId
function deleteRecord(rowIdx, theGridId, changeConfirmRemoveRow) {
	console.log([rowIdx, theGridId, changeConfirmRemoveRow]);
	if (!("undefined" == typeof confirmRemoveRowDialog)) {
		confirmRemoveRowDialog.hide();
	}
	if (changeConfirmRemoveRow == true) {
		confirmRemoveRow = false;
	}
	var theGrid = dijit.byId(theGridId);
	var gridItem = theGrid.getItem(rowIdx);
	if (gridItem !== null) {
		// Delete the item from the data store:
		theGrid.store.deleteItem(gridItem);
	}
}

//Add a row to the given grid
function addRow(rowIdx, theGrid) {
	theGrid = theGrid.substring(0,theGrid.length - 4); //Remove Hdr#. FIX this hack to get grid id
	theGrid = dijit.byId(theGrid);
	//console.log([rowIdx, theGrid]);
	var theStoreKind = theGrid.store.storeKind;
	// set the properties for the new item:
	if (theStoreKind == 'RA') {
		//Get the assignment percentage total and save new rows in array
		var gridPercentTotal = 100;
		var newRows = [];
		for (var i=0;i<theGrid.rowCount;i++) {
			var theItem = theGrid.getItem(i);
			if (theGrid.store.getValue(theItem, 'isInsert') === true) {
				newRows.push(theItem);
			} else {
				gridPercentTotal -= parseInt(theGrid.store.getValue(theItem, 'ASSIGNEE_ROOM_PERCENT'));
			}
			if (gridPercentTotal < 0) { //Min value is zero
				gridPercentTotal = 0;
				break;
			}
		}
		var newRowsPercent = Math.round(gridPercentTotal / (newRows.length + 1));
		//Set the percent value on the other new rows
		for (var i=0;i<newRows.length;i++) {
			theGrid.store.setValue(newRows[i], 'ASSIGNEE_ROOM_PERCENT', newRowsPercent)
		}
		
		//Get the org if no ra rows or null
		if (theGrid.rowCount == 0) {
			var roomOrg = theGrid.store.roomStore.getValue(theGrid.store.roomItem, "ORGANIZATION");
			var roomOrgName = theGrid.store.roomStore.getValue(theGrid.store.roomItem, "ORG_NAME");
		} else {
			var roomOrg = '';
			var roomOrgName = '';
		}
		
		var newItem = {
			isInsert: true,
			FACILITY_NUMBER: theGrid.store.raId["FACILITY_NUMBER"],
			FACILITY_CODE: null,
			ROOM_NUMBER: null,
			ASSIGNEE_ORGANIZATION: roomOrg,
			ORG_NAME: roomOrgName,
			ASSIGNEE_EMPLOYEE_ID: '999999999',
			EMPLOYEE_NAME: 'N/A',
			ASSIGNEE_ROOM_PERCENT: newRowsPercent,
			DEPT_NOTE: ''
		};
	} else if (theStoreKind == 'RAO') {
		var newItem = {
			isInsert: true,
			FACILITY_NUMBER: theGrid.store.raId["FACILITY_NUMBER"],
			FACILITY_CODE: null,
			ROOM_NUMBER: null,
			ORGANIZATION: theGrid.store.raId["ORGANIZATION"],
			EMPLOYEE_ID: theGrid.store.raId["EMPLOYEE_ID"],
			OCCUPANT_EID: ''
		}
	} else if (theStoreKind == 'RAU') {
		//Get the assignment percentage total and save new rows in array
		var gridPercentTotal = 100;
		var newRows = [];
		for (var i=0;i<theGrid.rowCount;i++) {
			var theItem = theGrid.getItem(i);
			if (theGrid.store.getValue(theItem, 'isInsert') === true) {
				newRows.push(theItem);
			} else {
				gridPercentTotal -= parseInt(theGrid.store.getValue(theItem, 'FUNCTIONAL_USE_PERCENT'));
			}
			if (gridPercentTotal < 0) { //Min value is zero
				gridPercentTotal = 0;
				break;
			}
		}
		var newRowsPercent = Math.round(gridPercentTotal / (newRows.length + 1));

		//Set the percent value on the other new rows
		for (var i=0;i<newRows.length;i++) {
			theGrid.store.setValue(newRows[i], 'FUNCTIONAL_USE_PERCENT', newRowsPercent)
		}
		
		var newItem = {
			isInsert: true,
			FACILITY_NUMBER: theGrid.store.raId["FACILITY_NUMBER"],
			FACILITY_CODE: null,
			ROOM_NUMBER: null,
			ORGANIZATION: theGrid.store.raId["ORGANIZATION"],
			EMPLOYEE_ID: theGrid.store.raId["EMPLOYEE_ID"],
			FUNCTIONAL_USE_CODE: '',
			FUNCTIONAL_USE_PERCENT: newRowsPercent
		}
	} else if (theStoreKind == 'RAB') {
		var newItem = {
			isInsert: true,
			FACILITY_NUMBER: theGrid.store.raId["FACILITY_NUMBER"],
			FACILITY_CODE: null,
			ROOM_NUMBER: null,
			ORGANIZATION: theGrid.store.raId["ORGANIZATION"],
			EMPLOYEE_ID: theGrid.store.raId["EMPLOYEE_ID"],
			FISCAL_YEAR_ENTERED: '',
			BUDGET_NUMBER: '',
			PRIMARY_ROOM: 'F'
		}
	} else if (theStoreKind == 'BRA') {
		var newItem = {
			isInsert: true,
			FISCAL_YEAR_ENTERED: theGrid.store.bId["BienniumYear"],
			BUDGET_NUMBER: theGrid.store.bId["BUDGET_NUMBER"],
			FACILITY_CODE: null,
			FACDESC: '',
			ROOM_NUMBER: null,
			ORGANIZATION: '?',
			EMPLOYEE_ID: '?',
			PRIMARY_ROOM: 'F'
		};
	} else {
		return false;
	}
	//console.log(newItem);
	// Insert the new item into the store:
	theGrid.store.newItem(newItem);
}

//add a message to the messages container on the map
function postClientMessage(msg) {
	var text = msg.text;
	var type = msg.type;
	
	var newMsg = dojo.create("p", {
			innerHTML: '<span>'+text+'</span>',
			"class": "msgItem " + type
		},
		"messagesContainer",
		"last");

	setTimeout(function() {
		dojo.fadeOut({node:newMsg,duration:2000}).play();
		setTimeout(function() {
			dojo.destroy(newMsg);
		},2000);
	},2000);
	
}


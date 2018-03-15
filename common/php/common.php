<?php //common.php

//Variables
//--Tables--
$tableFacility = 'DBO.FACILITY_TABLE';
$tableFloorCode = 'DBO.FLOOR_CODE';
$tableRoom = 'DBO.ROOM';
$tableRoomType = 'DBO.ROOM_TYPE';
$tableRoomAssignment = 'DBO.ROOM_ASSIGNMENT';
$tableRoomAssignmentOccupant = 'DBO.ROOM_ASSIGNMENT_OCCUPANT';
$tableRoomAssignmentUse = 'DBO.ROOM_ASSIGNMENT_USE';
$tableRoomsVsGrants = 'DBO.ROOMS_VS_GRANTS';
$tableOrg = 'DBO.FINANCIALORGANIZATIONCURRENTBIENNIUM';
$tableOrgDept = 'DBO.ORG_DEPT';
$tableEmployee = 'DBO.PERSON';
$tableBudget = 'DBO.BUDGETINDEXCURRENTBIENNIUM';
$tableUnasBdgt = 'DBO.UNASSIGNED_GRANTS';
$tableRoomType = 'DBO.ROOM_TYPE';
$tableFuncUseCode = 'DBO.FUNCTIONAL_USE_CODE';
$tableFuncUseCodeGroup = 'DBO.FUNC_USE_CODE_GROUP';
$raChildTables = array($tableRoomAssignmentOccupant,
											 $tableRoomAssignmentUse,
											 $tableRoomsVsGrants);

//--Application settings--
$queryCache_MaxTime = 60 * 5; //Time in seconds to cache the results of a query. Used in: mapviewer/php/listfacs.php, mapviewer/php/listfloors.php

//--PHP settings--
ini_set('display_errors', true); //Debugging
date_default_timezone_set('America/Los_Angeles'); //Set the timezone

//Requests a user's SIMS authorization and stores it as a session variable
function getAstraInfo($netID, $reload) {
	$reload = (isset($reload) ? $reload : false);
	session_start();
	if ($reload === false && isset($_SESSION['astraAuthz']) && (time() - $_SESSION['CREATED'] < 28800)) { //astra authz will be requeried after 8 hrs
		return $_SESSION['astraAuthz'];
	}
	require_once "Astra.php";
	$returnArr = array();
	// Create the Astra object and query Astra webservice
	$myAstra = new Astra();
	$responses = $myAstra->GetAuthz(array("NetID"=>$netID,"EnvCode"=>"prod", "PrivCode"=>"SIMS"));
	//var_dump($responses);
	// Collect each response's role and span(s) of control
	foreach ($responses as $response) {
		if ($response->party->uwNetid == $netID) { //netID arg should match returned netID.  Check not necessary?
			if (!(array_key_exists($response->role->code, $returnArr))) {  //If role code does not exist as key in return array, add key
				$returnArr[$response->role->code] = array();
			}
			//if (!(array_key_exists($response->action->code, $returnArr[$response->role->code]))) {  //If role code does not exist as key in return array, add key
			//		$returnArr[$response->role->code][$response->action->code] = array();
			//}
			foreach ($response->spanOfControlCollection as $spanOfControl) {  //Add span(s) of control 
				//$returnArr[$response->role->code][] = $spanOfControl->code;
				$returnArr[$response->role->code][] = array($spanOfControl->code,$spanOfControl->codeDescription);
				//if (!(array_key_exists($spanOfControl->kind, $returnArr[$response->role->code][$response->action->code]))) {  //If role code does not exist as key in return array, add key
				//		$returnArr[$response->role->code][$response->action->code][$spanOfControl->kind] = array();
				//}
				//$returnArr[$response->role->code][$response->action->code][$spanOfControl->kind][] = array($spanOfControl->code,$spanOfControl->codeDescription);
			}
		} else { 
			return array(); //Return empty array if netID arg doesn't match returned netID.  Check not necessary?
		}
	}
	//var_dump($returnArr);
	$_SESSION['astraAuthz'] = $returnArr;
	$_SESSION['CREATED'] = time();
	return $returnArr;  //Return array of roles and span(s) of control
}

function hasAuthz($authz) {
	if (count($authz) > 0) {
		return true;
	} else {
		return false;
	}
}

//Return a room's organization code
function getRoomOwnerOrg($conn, $facCode, $roomNum) {
	$stid = /**oci_parse**/odbc_prepare($conn, 'SELECT ORGANIZATION FROM ' . $GLOBALS['tableRoom'] . ' WHERE FACILITY_CODE = ? AND ROOM_NUMBER = ?');
	//oci_bind_by_name($stid, ":faccode_bv", $facCode, -1);
	//oci_bind_by_name($stid, ":roomnum_bv", $roomNum, -1);
	/**oci_execute**/odbc_execute($stid, array($facCode, $roomNum));
	$org = '';
	//while ($row = oci_fetch_array($stid, OCI_ASSOC+OCI_RETURN_NULLS)) {
	//	foreach ($row as $item) {
	//		$org = $item;
	//	}
	//}
	while ($row = odbc_fetch_array($stid)) {
		foreach ($row as $item) {
			$org = $item;
		}
	}
	//odbc_result_all($stid);
	/**oci_free_statement**/odbc_free_result($stid);
	return $org;
}

//Return a room's organization code
function getBudgetOrg($conn, $bdgtNum) {
	$stid = odbc_prepare($conn, 'SELECT OrgCode as ORGANIZATION FROM ' . $GLOBALS['tableBudget'] . ' WHERE BudgetNbr = ?');
	//oci_bind_by_name($stid, ":bdgtnum_bv", $bdgtNum, 6, SQLT_CHR);
	odbc_execute($stid, array($bdgtNum));
	$org = '';
	while ($row = odbc_fetch_array($stid)) {
		foreach ($row as $item) {
			$org = $item;
		}
	}
	odbc_free_result($stid);
	return $org;
}

//Check orgCode based ASTRA roles for authorization
function checkOrgRoles($astraAuthz, $orgCode) {
  //Check for OrgUser
	if (isset($astraAuthz['OrgUser'])) {
		$orgAuthz = $astraAuthz['OrgUser'];
		foreach ($orgAuthz as $auth) { //Loop through org code authorizations	
			// CAMPUS
			//Check first three digits of org code against authorization.
			if ((substr($orgCode,0,1) === substr($auth[0],0,1)) && (substr($auth[0],1,9) == 0)) {
				return 'ORG 1';
			// SCHOOL/COLLEGE/VP
			//Check first three digits of org code against authorization.
			} elseif ((substr($orgCode,0,3) === substr($auth[0],0,3)) && (substr($auth[0],3,7) == 0)) {
				return 'ORG 3';
			// SUBGROUP
			//Check first 5 digits of org code against authorization
			} elseif ((substr($orgCode,0,5) === substr($auth[0],0,5)) && (substr($auth[0],5,5) == 0)) {
				return 'ORG 5';
			// DEPARTMENT/OFFICE
			//Check first seven digits of org code against authorization
			} elseif ((substr($orgCode,0,7) === substr($auth[0],0,7)) && (substr($auth[0],7,3) == 0)) {
				return 'ORG 7';
			// DIVISION
			//Check first nine digits of org code against authorization
			} elseif ((substr($orgCode,0,9) === substr($auth[0],0,9)) && (substr($auth[0],9,1) == 0)) {
				return 'ORG 9';
			// SUBDIVISION
			//Check ten digits of org code against authorization
			} elseif ($orgCode === $auth[0]) {
				return 'ORG 10';
			}
		}
	}

	//Check for Cascadia
	if (isset($astraAuthz['Cascadia'])) {
		$cascadiaOrgStub = 'CASCADIA';
		if (substr($orgCode,0,strlen($cascadiaOrgStub)) === $cascadiaOrgStub) {
			return 'CASC';
		}
	}

	//Check for HMC
	if (isset($astraAuthz['HMC'])) {
		$hmcOrgStub = 'HMC';
		if (substr($orgCode,0,strlen($hmcOrgStub)) === $hmcOrgStub) {
			return 'HMC';
		}
	}
	return 0;
}
  
//Check for ASTRA authorizations
function checkRoomAuthz($conn, $astraAuthz, $facCode, $roomNum, $assignmentOrg) {
	//echo '-:'.$assignmentOrg.':-';

	//If there are authorizations begin checking against given facCode/roomNum/(optional)assignmentOrg
	if (count($astraAuthz) > 0) {
		//Check for SuperUser
		if (isset($astraAuthz['SuperUser'])) {
  		return 'SU';
  	}
  
		//Check for FacUser
  	if (isset($astraAuthz['FacUser'])) {
  		$facAuthz = $astraAuthz['FacUser'];
  		$facNum = getFacilityNumber($conn, $facCode);  //Get facNum
			if ($facNum != '') {
				foreach ($facAuthz as $auth) {  //Loop through facNum authorizations
					if ($facNum == $auth[0]) {
						return 'FU';
					}
				}
			}
		}
  
  	//Start org code checks: OrgUser, Cascadia, HMC.
  	//First check against room assignment org code, if given.
  	if (isset($assignmentOrg) && $assignmentOrg != '') {
  		$authorized = checkOrgRoles($astraAuthz, $assignmentOrg);
  		if (!($authorized === 0)) {
  			return $authorized;
  		}
  	}
  	// Then check against room owner org code.
  	$roomOwnerOrg = getRoomOwnerOrg($conn, $facCode, $roomNum); //Get room owner organization code
 		if ($roomOwnerOrg != '') {
 			$authorized = checkOrgRoles($astraAuthz, $roomOwnerOrg);
 			if (!($authorized === 0)) {
 				return $authorized;
 			}
 		}
  }
	
  return 0;
}

//Create connection variable
function createConn($user,$pwd,$servr,$dbase) {
	$conn = odbc_connect("Driver={SQL Server Native Client 11.0};Server=$servr;Database=$dbase",$user,$pwd);
	//if (odbc_error($conn)) {
  //  trigger_error(htmlentities(odbc_errormsg($conn), ENT_QUOTES), E_USER_ERROR);
	//}
	return $conn;
}

//Get facility_code from facilty_number
function getFacilityCode($conn, $facNum) {
	$stid = odbc_prepare($conn, 'SELECT FACILITY_CODE FROM ' . $GLOBALS['tableFacility'] . ' WHERE FACILITY_NUMBER = ?');
	//oci_bind_by_name($stid, ':facnum_bv', $facNum, -1);
	odbc_execute($stid, array($facNum));
	$facCode = '';
	while ($row = odbc_fetch_array($stid)) {
		foreach ($row as $item) {
			$facCode = $item;
		}
	}
	odbc_free_result($stid);
	return $facCode;
}

//Get facility_code from facilty_number
function getFacilityNumber($conn, $facCode) {
	$stid = odbc_prepare($conn, 'SELECT FACILITY_NUMBER FROM ' . $GLOBALS['tableFacility'] . ' WHERE FACILITY_CODE = ?');
	//oci_bind_by_name($stid, ':faccode_bv', $facCode, -1);
	odbc_execute($stid, array($facCode));
	$facNum = '';
	while ($row = odbc_fetch_array($stid)) {
		foreach ($row as $item) {
			$facNum = $item;
		}
	}
	odbc_free_result($stid);
	return $facNum;
}

//Return a room's assignment records
function getRoomAssignments($conn, $facCode, $roomNum) {
	$stid = odbc_prepare($conn, 'SELECT RA.ASSIGNEE_ORGANIZATION as ORGANIZATION, O.OrgName as ORG_NAME, RA.ASSIGNEE_EMPLOYEE_ID as EMPLOYEE_ID, E.DisplayName as EMPLOYEE_NAME, RA.ASSIGNEE_ROOM_PERCENT FROM ' . $GLOBALS['tableRoomAssignment'] . ' RA LEFT JOIN ' . $GLOBALS['tableOrg'] . ' O ON RA.ASSIGNEE_ORGANIZATION = O.OrgCode LEFT JOIN ' . $GLOBALS['tableEmployee'] . ' E ON RA.ASSIGNEE_EMPLOYEE_ID = E.EmployeeID WHERE FACILITY_CODE = ? AND ROOM_NUMBER = ?');
	//oci_bind_by_name($stid, ":faccode_bv", $facCode, -1);
	//oci_bind_by_name($stid, ":roomnum_bv", $roomNum, -1);
	odbc_execute($stid, array($facCode, $roomNum));
  $arr = processQuery($stid);
	odbc_free_result($stid);
	return $arr;
}

//Process query results
function processQuery($stid) {
	$resultArr = array();
	while ($row = odbc_fetch_array($stid)) {
		$resultArr[] = $row;
	}
	return $resultArr;
}

//Execute query, return number of rows affected
function makeQuery($conn, $queryStr, $bindArray) {
	//echo $queryStr.PHP_EOL;
	//var_dump($bindArray);
	$stid = odbc_prepare($conn, $queryStr);
	//Bind params to query
	$queryVals = array();
	foreach ($bindArray as $key => $value) {
		//echo json_encode(array($bindArray[$key][0], $bindArray[$key][1], $bindArray[$key][2], $bindArray[$key][3], $bindArray[$key][4])).PHP_EOL;
		//Do not bind a value which is null
		//Is this needed? Should let DB accept/reject null values. Code should remove column from $bindArray if "is Null" or "is not Null" syntax is needed (e.g. in Where-statement)
		//if (!(is_null($bindArray[$key][2]))) oci_bind_by_name($stid, $bindArray[$key][1], $bindArray[$key][2], $bindArray[$key][3], $bindArray[$key][4]);
		$queryVals[] = $bindArray[$key][2];
	}
	
	//Execute query
	odbc_execute($stid, $queryVals);
	$returnvar = odbc_num_rows($stid); //PHP ODBC documentation says odbc_num_rows is not supported in a SELECT statememt and returns -1 in all circumstances

	odbc_free_result($stid);
	return $returnvar;
}
?>

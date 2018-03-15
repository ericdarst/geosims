<?php
require_once 'login.php';
require_once 'common.php';

//Check $_POST and process request
if ((!empty($_POST["json"])) && (isset($_SERVER['HTTP_UWNETID']))) {
  //Validate keys from request and create 'INSERT' part of the query string
  function insertQueryStr($keys, $validKeys) {
  	if (count($keys) > 0) {
  		$returnStrArr = array('','');
  		foreach ($keys as $key => $value) {
  			if (array_key_exists($key, $validKeys)) { //If key is in validKeys list
  				if (strlen($returnStrArr[0]) > 0) {
  					$returnStrArr[0] .= ',';
  					$returnStrArr[1] .= ',';
  				}
  				$returnStrArr[0] .= $validKeys[$key][0];
  				$returnStrArr[1] .= '?';//$validKeys[$key][1];
  				unset($validKeys[$key]);
  			} else {
  				//echo 'Invalid column name: '.$key;
  				$returnStrArr = '';
  				break;
  			}
  		}
  		if (count($validKeys) > 0) {
  			echo 'Incomplete insert keys array';
  			return '';
  		}
  		//Add CREATE_NETID and CREATE_NETID_DATE
  		$returnStrArr[0] .= ",CREATE_NETID,CREATE_NETID_DATE";
			$returnStrArr[1] .= ",?,SYSDATETIME()";//",:createnetid_bv,SYSDATETIME()";
  		return $returnStrArr;
  	} else {
  		return '';
  	}
  }
  
	$userNetid = $_SERVER['HTTP_UWNETID'];
	$astraAuthz = getAstraInfo($userNetid, false);

	//Define return array
	$arr = array(
		'request' => json_decode($_POST["json"], true), //Populate request array
		'results' => array("rowsUpdated" => 0 ));

	//Connection session variable
	$conn = createConn($db_username,$db_password,$db_server,$db_database);  //Connection property variables defined in login.php
	
	//Define variables from request array
	$recordID = $arr['request']['insertRecord']['recordID'];
	$kind = $recordID['kind'];
	$insert = $arr['request']['insertRecord']['insert'];
	$facCode = $insert['FACILITY_CODE'];
	$roomNum = $insert['ROOM_NUMBER'];
	$assignmentOrg = '';

	if ($kind == 'BRA') {
		//Need to check room org (done), assignment org (NOT DONE), and budget org (done)
		$assignmentOrg = getBudgetOrg($conn, $insert['BUDGET_NUMBER']);
	} elseif ($kind != 'RA') {
		$assignmentOrg = $insert['ORGANIZATION'];
	}
	$queryStr = '';
	
	$authorized = 0;
	$authorized = checkRoomAuthz($conn, $astraAuthz, $facCode, $roomNum, $assignmentOrg);

	if (!($authorized === 0)) {
  	//Insert Room Assignment
  	if ($kind == 'RA') {
  		$validKeys = array('FACILITY_CODE' => array('FACILITY_CODE',':faccode_bv',$insert['FACILITY_CODE'],4,'SQLT_CHR'),
  											 'ROOM_NUMBER' => array('ROOM_NUMBER',':roomnum_bv',$insert['ROOM_NUMBER'],13,'SQLT_CHR'),
  											 'ASSIGNEE_ORGANIZATION' => array('ASSIGNEE_ORGANIZATION',':raorg_bv',$insert['ASSIGNEE_ORGANIZATION'],10,'SQLT_CHR'),
  											 'ASSIGNEE_EMPLOYEE_ID' => array('ASSIGNEE_EMPLOYEE_ID',':raeid_bv',$insert['ASSIGNEE_EMPLOYEE_ID'],9,'SQLT_CHR'),
  											 'ASSIGNEE_ROOM_PERCENT' => array('ASSIGNEE_ROOM_PERCENT',':rarmper_bv',$insert['ASSIGNEE_ROOM_PERCENT'],3,'SQLT_INT'),
  											 'DEPT_NOTE' => array('DEPT_NOTE',':radnote_bv',$insert['DEPT_NOTE'],256,'SQLT_CHR'));  		
  		
  		$queryStr = insertQueryStr($insert, $validKeys);
  		
  		if ($queryStr != '') {
  			//Update room assignment query string
  			$queryStr = 'INSERT INTO ' . $tableRoomAssignment
  								. ' (' . $queryStr[0] . ') VALUES (' . $queryStr[1] . ') ';
  			$bindArray = array('CREATE_NETID' => array('CREATE_NETID',':createnetid_bv',$userNetid,128,'SQLT_CHR'));
  			//Make query and populate results array
  			$arr['results']['rowsUpdated'] = makeQuery($conn, $queryStr, array_merge($validKeys, $bindArray));

  		} else {
  			echo 'Invalid request.';
  			$arr['results']['rowsUpdated'] = 0;
  		}
  	}
  	
  	//Update Room Assignment Occupant
  	elseif ($kind == 'RAO') {
  		$validKeys = array('FACILITY_CODE' => array('FACILITY_CODE',':faccode_bv',$insert['FACILITY_CODE'],4,'SQLT_CHR'),
  											 'ROOM_NUMBER' => array('ROOM_NUMBER',':roomnum_bv',$insert['ROOM_NUMBER'],13,'SQLT_CHR'),
  											 'ORGANIZATION' => array('ORGANIZATION',':raorg_bv',$insert['ORGANIZATION'],10,'SQLT_CHR'),
  											 'EMPLOYEE_ID' => array('EMPLOYEE_ID',':raeid_bv',$insert['EMPLOYEE_ID'],9,'SQLT_CHR'),
  											 'OCCUPANT_EID' => array('OCCUPANT_EID',':raoeid_bv',$insert['OCCUPANT_EID'],9,'SQLT_CHR'));
  		$queryStr = insertQueryStr($insert, $validKeys);
  		
  		if ($queryStr != '') {
  			//Update room assignment query string
  			$queryStr = 'INSERT INTO ' . $tableRoomAssignmentOccupant
  								. ' ('.$queryStr[0].') VALUES ('.$queryStr[1].') ';
  			$bindArray = array('CREATE_NETID' => array('CREATE_NETID',':createnetid_bv',$userNetid,128,'SQLT_CHR'));
  			//Make query and populate results array
  			$arr['results']['rowsUpdated'] = makeQuery($conn, $queryStr, array_merge($validKeys, $bindArray));
  		} else {
  			echo 'Invalid request.';
  			$arr['results']['rowsUpdated'] = 0;
  		}
  	}
  	
  	//Update Room Assignment Use
  	elseif ($kind == 'RAU') {
  		$validKeys = array('FACILITY_CODE' => array('FACILITY_CODE',':faccode_bv',$insert['FACILITY_CODE'],4,'SQLT_CHR'),
  											 'ROOM_NUMBER' => array('ROOM_NUMBER',':roomnum_bv',$insert['ROOM_NUMBER'],13,'SQLT_CHR'),
  											 'ORGANIZATION' => array('ORGANIZATION',':raorg_bv',$insert['ORGANIZATION'],10,'SQLT_CHR'),
  											 'EMPLOYEE_ID' => array('EMPLOYEE_ID',':raeid_bv',$insert['EMPLOYEE_ID'],9,'SQLT_CHR'),
  											 'FUNCTIONAL_USE_CODE' => array('FUNCTIONAL_USE_CODE',':raucode_bv',$insert['FUNCTIONAL_USE_CODE'],8,'SQLT_CHR'),
  											 'FUNCTIONAL_USE_PERCENT' => array('FUNCTIONAL_USE_PERCENT',':rauper_bv',$insert['FUNCTIONAL_USE_PERCENT'],3,'SQLT_INT'));
  		$queryStr = insertQueryStr($insert, $validKeys);
  		
  		if ($queryStr != '') {
  			//Update room assignment query string
  			$queryStr = 'INSERT INTO ' . $tableRoomAssignmentUse
  								. ' ('.$queryStr[0].') VALUES ('.$queryStr[1].') ';
  			$bindArray = array('CREATE_NETID' => array('CREATE_NETID',':createnetid_bv',$userNetid,128,'SQLT_CHR'));
  			//Make query and populate results array
  			$arr['results']['rowsUpdated'] = makeQuery($conn, $queryStr, array_merge($validKeys, $bindArray));
  		} else {
  			echo 'Invalid request.';
  			$arr['results']['rowsUpdated'] = 0;
  		}
  	}

  	//Budget query string
  	elseif ($kind == 'RAB') {
  		$validKeys = array('FACILITY_CODE' => array('FACILITY_CODE',':faccode_bv',$insert['FACILITY_CODE'],4,'SQLT_CHR'),
  											 'ROOM_NUMBER' => array('ROOM_NUMBER',':roomnum_bv',$insert['ROOM_NUMBER'],13,'SQLT_CHR'),
  											 'ORGANIZATION' => array('ORGANIZATION',':raorg_bv',$insert['ORGANIZATION'],10,'SQLT_CHR'),
  											 'EMPLOYEE_ID' => array('EMPLOYEE_ID',':raeid_bv',$insert['EMPLOYEE_ID'],10,'SQLT_CHR'),
												 'FISCAL_YEAR_ENTERED' => array('FISCAL_YEAR_ENTERED',':bdgtfy_bv',$insert['FISCAL_YEAR_ENTERED'],4,'SQLT_CHR'),
  											 'BUDGET_NUMBER' => array('BUDGET_NUMBER',':bdgnum_bv',$insert['BUDGET_NUMBER'],6,'SQLT_CHR'),
  											 'PRIMARY_ROOM' => array('PRIMARY_ROOM',':bdgpr_bv',$insert['PRIMARY_ROOM'],1,'SQLT_CHR'));
  		$queryStr = insertQueryStr($insert, $validKeys);
  		
  		if ($queryStr != '') {
  			//Update room assignment query string
  			$queryStr = 'INSERT INTO ' . $tableRoomsVsGrants
  								. ' ('.$queryStr[0].') VALUES ('.$queryStr[1].') ';
  			$bindArray = array('CREATE_NETID' => array('CREATE_NETID',':createnetid_bv',$userNetid,128,'SQLT_CHR'));
  			//Make query and populate results array
  			$arr['results']['rowsUpdated'] = makeQuery($conn, $queryStr, array_merge($validKeys, $bindArray));
  		} else {
  			echo 'Invalid request.';
  			$arr['results']['rowsUpdated'] = 0;
  		}
  	}
  	
  	//Budget query string
  	elseif ($kind == 'BRA') {
  		$validKeys = array('FISCAL_YEAR_ENTERED' => array('FISCAL_YEAR_ENTERED',':bdgtfy_bv',$insert['FISCAL_YEAR_ENTERED'],4,'SQLT_CHR'),
  											 'BUDGET_NUMBER' => array('BUDGET_NUMBER',':bdgnum_bv',$insert['BUDGET_NUMBER'],6,'SQLT_CHR'),
												 'FACILITY_CODE' => array('FACILITY_CODE',':faccode_bv',$insert['FACILITY_CODE'],4,'SQLT_CHR'),
  											 'ROOM_NUMBER' => array('ROOM_NUMBER',':roomnum_bv',$insert['ROOM_NUMBER'],13,'SQLT_CHR'),
  											 'ORGANIZATION' => array('ORGANIZATION',':raorg_bv',$insert['ORGANIZATION'],10,'SQLT_CHR'),
  											 'EMPLOYEE_ID' => array('EMPLOYEE_ID',':raeid_bv',$insert['EMPLOYEE_ID'],10,'SQLT_CHR'),
  											 'PRIMARY_ROOM' => array('PRIMARY_ROOM',':bdgpr_bv',$insert['PRIMARY_ROOM'],1,'SQLT_CHR'));

  		//If FACILITY_CODE and ROOM_NUMBER are not Null (and ORGANIZATION or EMPLOYEE_ID are NULL?)
  		if (is_null($insert['FACILITY_CODE']) == false && is_null($insert['ROOM_NUMBER']) == false) {
  			//Check if # of room assignments for room record is equal to one
  			//echo json_encode(getRoomAssignments($conn, $facCode, $roomNum));
  			$BRAroomAssignmentRecords = getRoomAssignments($conn, $facCode, $roomNum);
  			if (count($BRAroomAssignmentRecords) == 1) {
  				//Set ORGANIZATION and EMPLOYEE_ID values to the one record, return ORGANIZATION, ORG_NAME, EMPLOYEE_ID, EMPLOYEE_NAME, and ROOM_PERCENT
  				$validKeys['ORGANIZATION'][2] = $BRAroomAssignmentRecords[0]['ORGANIZATION'];
  				$validKeys['EMPLOYEE_ID'][2] = $BRAroomAssignmentRecords[0]['EMPLOYEE_ID'];
  				$arr['results']['refresh'] = $BRAroomAssignmentRecords[0];
  			} else {
  				$arr['results']['options'] = $BRAroomAssignmentRecords;
  			}
  		}
  		
  		$queryStr = insertQueryStr($insert, $validKeys);
  		
  		if ($queryStr != '') {
  			//Update room assignment query string
  			$queryStr = 'INSERT INTO ' . $tableRoomsVsGrants
  								. ' ('.$queryStr[0].') VALUES ('.$queryStr[1].') ';
  			$bindArray = array('CREATE_NETID' => array('CREATE_NETID',':createnetid_bv',$userNetid,128,'SQLT_CHR'));
  			//Make query and populate results array
  			$arr['results']['rowsUpdated'] = makeQuery($conn, $queryStr, array_merge($validKeys, $bindArray));
  		} else {
  			echo 'Invalid request.';
  			$arr['results']['rowsUpdated'] = 0;
  		}
  	}
  //No Astra authorization message
	} else {
		$arr['results']['msg'] = 'Not authorized.';
	}
	
	//Close connection
	odbc_close($conn);

	//echo return array as json string
	echo json_encode($arr['results']);
}

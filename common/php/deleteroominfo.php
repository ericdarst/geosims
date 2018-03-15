<?php
require_once 'login.php';
require_once 'common.php';

//Check $_POST and process request
if ((!empty($_POST["json"])) && (isset($_SERVER['HTTP_UWNETID']))) {
  //Validate keys from request and create 'WHERE' part of the query string
  function deleteQueryStr($keys, $validKeys) {
  	$returnStr = '';
		$returnArr = array();
  	foreach ($keys as $key => $value) {
  		if (array_key_exists($key, $validKeys)) {
  			if (strlen($returnStr) > 0) {
  				$returnStr .= ' AND ';
  			}
  			//$returnStr = $returnStr.$validKeys[$key][0]."=".$validKeys[$key][1];
  			//$returnStr .= is_null($validKeys[$key][2])?$validKeys[$key][0].' IS NULL ':$validKeys[$key][0].'='."?";//.$validKeys[$key][1];
				if (is_null($validKeys[$key][2])) {
					$returnStr .= $validKeys[$key][0].' IS NULL ';
				} else {
					$returnStr .= $validKeys[$key][0].'='."?";
					$returnArr[] = $validKeys[$key];
				}
  			unset($validKeys[$key]);
  		} else {
  			//echo 'Invalid column name: '.$key;
  			$returnStr = '';
  			break;
  		}
  	}
  	if (count($validKeys) != 0) { //DELETE query request must contain all keys found in $validKeys
  		$returnStr = '';
			$returnArr = array();
  	}
  	return array($returnStr, $returnArr);
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
	$recordID = $arr['request']['deleteRecord']['recordID'];
	$kind = $recordID['kind'];
	$delete = $arr['request']['deleteRecord']['deleteRec'];
	$facCode = $delete['FACILITY_CODE'];
	$roomNum = $delete['ROOM_NUMBER'];
	$assignmentOrg = '';
	if ($kind == 'RA') {
		$assignmentOrg = $delete['ASSIGNEE_ORGANIZATION'];
	} elseif ($kind == 'BRA') {
		//Need to check room org (done), assignment org (NOT DONE), and budget org (done)
		$assignmentOrg = getBudgetOrg($conn, $delete['BUDGET_NUMBER']);
	} else {
		$assignmentOrg = $delete['ORGANIZATION'];
	}
	$queryStr = '';

	$authorized = 0;
	$authorized = checkRoomAuthz($conn, $astraAuthz, $facCode, $roomNum, $assignmentOrg);

	if (!($authorized === 0)) {
		//Update Room Assignment
  	if ($kind == 'RA') {
  		$validKeys = array('FACILITY_CODE' => array('FACILITY_CODE',':faccode_bv',$delete['FACILITY_CODE'],4,'SQLT_CHR'),
  											 'ROOM_NUMBER' => array('ROOM_NUMBER',':roomnum_bv',$delete['ROOM_NUMBER'],13,'SQLT_CHR'),
  											 'ASSIGNEE_ORGANIZATION' => array('ASSIGNEE_ORGANIZATION',':raorg_bv',$delete['ASSIGNEE_ORGANIZATION'],10,'SQLT_CHR'),
  											 'ASSIGNEE_EMPLOYEE_ID' => array('ASSIGNEE_EMPLOYEE_ID',':raeid_bv',$delete['ASSIGNEE_EMPLOYEE_ID'],9,'SQLT_CHR'));
  		$queryVars = deleteQueryStr($delete, $validKeys);
			$queryStr = $queryVars[0];
			$queryKeys = $queryVars[1];
  		if ($queryStr != '') {
  			$validChildKeys = array('FACILITY_CODE' => array('FACILITY_CODE',':faccode_bv',$delete['FACILITY_CODE'],4,'SQLT_CHR'),
  											 				'ROOM_NUMBER' => array('ROOM_NUMBER',':roomnum_bv',$delete['ROOM_NUMBER'],13,'SQLT_CHR'),
  											 				'ASSIGNEE_ORGANIZATION' => array('ORGANIZATION',':raorg_bv',$delete['ASSIGNEE_ORGANIZATION'],10,'SQLT_CHR'),
  											 				'ASSIGNEE_EMPLOYEE_ID' => array('EMPLOYEE_ID',':raeid_bv',$delete['ASSIGNEE_EMPLOYEE_ID'],9,'SQLT_CHR'));
  			$childQueryVars = deleteQueryStr($delete, $validChildKeys);
				$childQueryStr = $childQueryVars[0];
				$childQueryKeys = $childQueryVars[1];
  			$childRowsUpdated = 0;
  			//Loop through Room Assignment child tables and run delete query
  			foreach ($raChildTables as $raChildTable) {
    			//Room Assignment Use query string
    			$queryStr_child = 'DELETE FROM ' . $raChildTable
    									  	. ' WHERE ' . $childQueryStr;
    			//Write and execute query for Room Assignment
					odbc_autocommit($conn, false);
    			$stid = odbc_prepare($conn, $queryStr_child);
					$queryVals = array();
    			foreach ($childQueryKeys as $key => $value) {
    				//oci_bind_by_name($stid, $validChildKeys[$key][1], $validChildKeys[$key][2], $validChildKeys[$key][3], $validChildKeys[$key][4]); //Bind params to query
						$queryVals[] = $childQueryKeys[$key][2];
    			}
    			$r = odbc_execute($stid, $queryVals); //Execute query, do not commit
  				if ($r === false) { //If query returned false, break
  					break;
  				} else {
    				$childRowsUpdated += odbc_num_rows($stid);  //Row count
    			}
  			}
  			if (!$r) { //If query returned false, throw error and rollback
      		$e = odbc_errormsg($stid);
      		odbc_rollback($conn);  //Rollback changes to tables
      		trigger_error(htmlentities($e), E_USER_ERROR);
  			} else {
  				//Write and execute query for Room Assignment
  				$queryStr_RA = 'DELETE FROM ' . $tableRoomAssignment
  										 . ' WHERE ' . $queryStr;
  				$stid = odbc_prepare($conn, $queryStr_RA);
					$queryVals = array();
  				foreach ($queryKeys as $key => $value) {
  					//oci_bind_by_name($stid, $validKeys[$key][1], $validKeys[$key][2], $validKeys[$key][3], $validKeys[$key][4]); //Bind params to query
						$queryVals[] = $queryKeys[$key][2];
  				}
  				$r = odbc_execute($stid, $queryVals); //Execute query, do not commit
  				if ($r === false) { //If query returned false, throw error and rollback
      			$e = odbc_errormsg($stid);
      			odbc_rollback($conn);  //Rollback changes to both tables
      			trigger_error(htmlentities($e), E_USER_ERROR);
  				} else {
  					$rowsUpdated = odbc_num_rows($stid);  //Row count
  						
  					//Commit Room Assignment and Room Assignment Use queries
  					$r = odbc_commit($conn);
  					if ($r === false) { //If commit returned false, throw error and rollback
      				$e = odbc_errormsg($conn);
      				trigger_error(htmlentities($e), E_USER_ERROR);
  					} else {
  						$arr['results']['rowsUpdated'] = $rowsUpdated;
  						$arr['results']['childRowsUpdated'] = $childRowsUpdated;
  					}
  				}
  			}
  			odbc_free_result($stid);
				odbc_autocommit($conn, true);
  		} else {
  			echo 'Invalid request.';
  			$arr['results']['rowsUpdated'] = 0;
  		}
  	}
  	
  	//Update Room Assignment Occupant
  	elseif ($kind == 'RAO') {
  		$validKeys = array('FACILITY_CODE' => array('FACILITY_CODE',':faccode_bv',$delete['FACILITY_CODE'],4,'SQLT_CHR'),
  											 'ROOM_NUMBER' => array('ROOM_NUMBER',':roomnum_bv',$delete['ROOM_NUMBER'],13,'SQLT_CHR'),
  											 'ORGANIZATION' => array('ORGANIZATION',':raorg_bv',$delete['ORGANIZATION'],10,'SQLT_CHR'),
  											 'EMPLOYEE_ID' => array('EMPLOYEE_ID',':raeid_bv',$delete['EMPLOYEE_ID'],9,'SQLT_CHR'),
  											 'OCCUPANT_EID' => array('OCCUPANT_EID',':raoeid_bv',$delete['OCCUPANT_EID'],9,'SQLT_CHR'));
			$queryVars = deleteQueryStr($delete, $validKeys);
			$queryStr = $queryVars[0];
			$queryKeys = $queryVars[1];
  		if ($queryStr != '') {
  			//Delete room assignment use query string
  			$queryStr = 'DELETE FROM ' . $tableRoomAssignmentOccupant
  								. ' WHERE ' . $queryStr;
  			//Make query and populate results array			
  			$arr['results']['rowsUpdated'] = makeQuery($conn, $queryStr, $queryKeys);
  		} else {
  			echo 'Invalid request.';
  			$arr['results']['rowsUpdated'] = 0;
  		}
  	}
  	
  	//Update Room Assignment Use
  	elseif ($kind == 'RAU') {
  		$validKeys = array('FACILITY_CODE' => array('FACILITY_CODE',':faccode_bv',$delete['FACILITY_CODE'],4,'SQLT_CHR'),
  											 'ROOM_NUMBER' => array('ROOM_NUMBER',':roomnum_bv',$delete['ROOM_NUMBER'],13,'SQLT_CHR'),
  											 'ORGANIZATION' => array('ORGANIZATION',':raorg_bv',$delete['ORGANIZATION'],10,'SQLT_CHR'),
  											 'EMPLOYEE_ID' => array('EMPLOYEE_ID',':raeid_bv',$delete['EMPLOYEE_ID'],9,'SQLT_CHR'),
  											 'FUNCTIONAL_USE_CODE' => array('FUNCTIONAL_USE_CODE',':raucd_bv',$delete['FUNCTIONAL_USE_CODE'],8,'SQLT_CHR'));
			$queryVars = deleteQueryStr($delete, $validKeys);
			$queryStr = $queryVars[0];
			$queryKeys = $queryVars[1];
  		if ($queryStr != '') {
  			//Delete room assignment use query string
  			$queryStr = 'DELETE FROM ' . $tableRoomAssignmentUse
  								. ' WHERE ' . $queryStr;
  			//Make query and populate results array			
  			$arr['results']['rowsUpdated'] = makeQuery($conn, $queryStr, $queryKeys);
  		} else {
  			echo 'Invalid request.';
  			$arr['results']['rowsUpdated'] = 0;
  		}
  	}

  	//Budget query string
  	elseif ($kind == 'RAB') {
  		$validKeys = array('FACILITY_CODE' => array('FACILITY_CODE',':faccode_bv',$delete['FACILITY_CODE'],4,'SQLT_CHR'),
  											 'ROOM_NUMBER' => array('ROOM_NUMBER',':roomnum_bv',$delete['ROOM_NUMBER'],13,'SQLT_CHR'),
  											 'ORGANIZATION' => array('ORGANIZATION',':raorg_bv',$delete['ORGANIZATION'],10,'SQLT_CHR'),
  											 'EMPLOYEE_ID' => array('EMPLOYEE_ID',':raeid_bv',$delete['EMPLOYEE_ID'],9,'SQLT_CHR'),
  											 'FISCAL_YEAR_ENTERED' => array('FISCAL_YEAR_ENTERED',':bdgtfy_bv',$delete['FISCAL_YEAR_ENTERED'],4,'SQLT_CHR'),
  											 'BUDGET_NUMBER' => array('BUDGET_NUMBER',':bdgtnum_bv',$delete['BUDGET_NUMBER'],6,'SQLT_CHR'));
			$queryVars = deleteQueryStr($delete, $validKeys);
			$queryStr = $queryVars[0];
			$queryKeys = $queryVars[1];
  		if ($queryStr != '') {
  			//Delete room assignment use query string
  			$queryStr = 'DELETE FROM ' . $tableRoomsVsGrants
  								. ' WHERE ' . $queryStr;

  			//Make query and populate results array			
  			$arr['results']['rowsUpdated'] = makeQuery($conn, $queryStr, $queryKeys);
  		} else {
  			echo 'Invalid request.';
  			$arr['results']['rowsUpdated'] = 0;
  		}
  	}
  	
  	//Budget query string
  	elseif ($kind == 'BRA') {
  		$validKeys = array('FACILITY_CODE' => array('FACILITY_CODE',':faccode_bv',$delete['FACILITY_CODE'],4,'SQLT_CHR'),
  											 'ROOM_NUMBER' => array('ROOM_NUMBER',':roomnum_bv',$delete['ROOM_NUMBER'],13,'SQLT_CHR'),
  											 'ORGANIZATION' => array('ORGANIZATION',':raorg_bv',$delete['ORGANIZATION'],10,'SQLT_CHR'),
  											 'EMPLOYEE_ID' => array('EMPLOYEE_ID',':raeid_bv',$delete['EMPLOYEE_ID'],9,'SQLT_CHR'),
  											 'FISCAL_YEAR_ENTERED' => array('FISCAL_YEAR_ENTERED',':bdgtfy_bv',$delete['FISCAL_YEAR_ENTERED'],4,'SQLT_CHR'),
  											 'BUDGET_NUMBER' => array('BUDGET_NUMBER',':bdgtnum_bv',$delete['BUDGET_NUMBER'],6,'SQLT_CHR'));
			$queryVars = deleteQueryStr($delete, $validKeys);
			$queryStr = $queryVars[0];
			$queryKeys = $queryVars[1];
  		if ($queryStr != '') {
  			//Delete room assignment use query string
  			$queryStr = 'DELETE FROM ' . $tableRoomsVsGrants
  								. ' WHERE ' . $queryStr;

				//echo $queryStr.PHP_EOL;
				//var_dump($queryKeys);
  			//Make query and populate results array
  			$arr['results']['rowsUpdated'] = makeQuery($conn, $queryStr, $queryKeys);
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


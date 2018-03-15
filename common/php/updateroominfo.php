<?php
//Check $_POST for pubcookie netid
if ((!empty($_POST["json"])) && (isset($_SERVER['HTTP_UWNETID']))) {
	require_once 'login.php';
	require_once 'common.php';
  //Validate keys from request and create 'SET' part of the query string
  function updateQueryStr($keys, $validKeys) {
  	$returnStr = '';
  	$returnArr = array();
  	foreach ($keys as $key => $value) {
  		if (array_key_exists($key, $validKeys)) {
  			//$returnStr = $returnStr . $key . "='" . $value.  "' ";
  			if (strlen($returnStr) != 0) {
  				$returnStr .= ', ';
  			}
  			$returnStr .= $validKeys[$key][0]." = "."?";//$validKeys[$key][1];
  			$validKeys[$key][2] = $value;
  			$returnArr[] = $validKeys[$key];
  			unset($validKeys[$key]);
  		} else {
  			//echo 'Invalid column name: '.$key;
  			$returnStr = '';
  			break;
  		}
  	}
  	//Add MOD_NETID and MOD_NETID_DATE
  	$returnStr .= ", MOD_NETID = ?, MOD_NETID_DATE = SYSDATETIME() ";
  	return array($returnStr, $returnArr);
  }
	
	//Check existance of a room record
  function checkRoom($conn, $facCode, $roomNum) {
  	$stid = odbc_prepare($conn, 'SELECT FACILITY_CODE, ROOM_NUMBER FROM ' . $GLOBALS['tableRoom'] . ' WHERE FACILITY_CODE = ? AND ROOM_NUMBER = ?');
  	//oci_bind_by_name($stid, ":faccode_bv", $facCode, -1);
  	//oci_bind_by_name($stid, ":roomnum_bv", $roomNum, -1);
  	odbc_execute($stid, array($facCode, $roomNum));
    $count = count(processQuery($stid));
  	odbc_free_result($stid);
  	return $count;
  }
	
	//Check existance of a room assignment record
	/**function checkRoomAssignment($conn, $facCode, $roomNum, $raOrg, $raEID) {
	  $stid = oci_parse($conn, 'SELECT FACILITY_CODE, ROOM_NUMBER, ASSIGNEE_ORGANIZATION, ASSIGNEE_EMPLOYEE_ID, ASSIGNEE_ROOM_PERCENT FROM ' . $GLOBALS['tableRoomAssignment'] . ' WHERE FACILITY_CODE = ? AND ROOM_NUMBER = ? AND ');
  	//oci_bind_by_name($stid, ":faccode_bv", $facCode, -1);
  	//oci_bind_by_name($stid, ":roomnum_bv", $roomNum, -1);
  	//oci_bind_by_name($stid, ":raorg_bv", $raOrg, -1);
  	//oci_bind_by_name($stid, ":raeid_bv", $raEID, -1);
  	oci_execute($stid);
    $count = count(processQuery($stid));
  	oci_free_statement($stid);
  	return $count;
  }**/
  
	$userNetid = $_SERVER['HTTP_UWNETID'];
	$astraAuthz = getAstraInfo($userNetid, false); //Get ASTRA authorizations for netid
	
	//Define return array
	$arr = array(
		'request' => json_decode($_POST["json"], true), //Populate request array
		'results' => array("rowsUpdated" => 0 ));
	
	//Connection session variable
	$conn = createConn($db_username,$db_password,$db_server,$db_database);  //Connection property variables defined in login.php
	
	//Define variables from request array
	$recordID = $arr['request']['updateRecord']['recordID'];
	$kind = $recordID['kind'];
	$facCode = $recordID['FACILITY_CODE'];
	$roomNum = $recordID['ROOM_NUMBER'];
	$assignmentOrg = '';
	if ($kind != 'R') {
		if ($kind == 'RA') {
			$assignmentOrg = $recordID['ASSIGNEE_ORGANIZATION'];
		} elseif ($kind == 'BRA') {
			//Need to check room org (done), assignment org (NOT DONE), and budget org (done)
			$assignmentOrg = getBudgetOrg($conn, $recordID['BUDGET_NUMBER']);
		} else {
			$assignmentOrg = $recordID['ORGANIZATION'];
		}
	}
	$update = $arr['request']['updateRecord']['update'];
	$queryStr = '';
	$authorized = 0;
	$authorized = checkRoomAuthz($conn, $astraAuthz, $facCode, $roomNum, $assignmentOrg);

	if (!($authorized === 0)) {
		//Update Room
		if ($kind == 'R') {
			//$authorized = checkRoomAuthz($conn, $astraAuthz, $facCode, $roomNum);
			$validKeys = array('ROOM_TYPE' => array('ROOM_TYPE',':rrmtup_bv',null,3,null),//SQLT_CHR),
												 'ORGANIZATION' => array('ORGANIZATION',':rorgup_bv',null,10,null),//SQLT_CHR),
												 'CAPACITY' => array('CAPACITY',':rcap_bv',null,4,null));//SQLT_INT));
			$queryVars = updateQueryStr($update, $validKeys);
			$queryStr = $queryVars[0];
			$queryKeys = $queryVars[1];
			if ($queryStr != '') {
			  //Room query string
				$queryStr = 'UPDATE ' . $tableRoom
									. ' SET ' . $queryStr
									. 'WHERE FACILITY_CODE = ? AND ROOM_NUMBER = ?';
				//TO DO: Create 'where' string from bind array 
				$bindArray = array('MOD_NETID' => array('MOD_NETID',':modnetid_bv',$userNetid,128,null),//SQLT_CHR),
													 'FACILITY_CODE' => array('FACILITY_CODE',':faccode_bv',$facCode,4,null),//SQLT_CHR),
													 'ROOM_NUMBER' => array('ROOM_NUMBER',':roomnum_bv',$roomNum,13,null));//SQLT_CHR));
  			//$bindArray = array_merge($bindArray, $queryKeys);
				//Make query and populate results array
				$arr['results']['rowsUpdated'] = makeQuery($conn, $queryStr, array_merge($queryKeys, $bindArray));
			} else {
				//echo 'Invalid request.';
				$arr['results']['msg'] = 'Invalid request.';
				$arr['results']['rowsUpdated'] = 0;
			}
		}

  	//Update Room Assignment
  	elseif ($kind == 'RA') {
  		//$authorized = checkRoomAuthz($conn, $astraAuthz, $facCode, $roomNum, );
  		//if (!($authorized === 0)) {
  		$validKeys = array('ASSIGNEE_ORGANIZATION' => array('ASSIGNEE_ORGANIZATION',':raorgup_bv',null,10,null),//SQLT_CHR),
  											 'ASSIGNEE_EMPLOYEE_ID' => array('ASSIGNEE_EMPLOYEE_ID',':raeidup_bv',null,9,null),//SQLT_CHR),
  											 'ASSIGNEE_ROOM_PERCENT' => array('ASSIGNEE_ROOM_PERCENT',':rarmprup_bv',null,3,null),//SQLT_INT),
  											 'DEPT_NOTE' => array('DEPT_NOTE',':radnoteup_bv',null,256,null));//SQLT_CHR));
  		
  		//Check if columns to be updated are identifiers, if so children of the Room Assignment record need to have identifiers updated
  		$idKeys = array('ASSIGNEE_ORGANIZATION' => 'ORGANIZATION',
  										'ASSIGNEE_EMPLOYEE_ID' => 'EMPLOYEE_ID');
  		//Populate array of identifier columns found in update array
			$updateRaChildArr = array();
  		foreach ($update as $key => $value) {
  			if (array_key_exists($key, $idKeys)) {
  				$updateRaChildArr[$idKeys[$key]] = $value;
  			}
  		}
  		
			$queryVars = updateQueryStr($update, $validKeys);
			$queryStr = $queryVars[0];
			$queryKeys = $queryVars[1];
			
  		if ($queryStr != '') {
  			//Define variables
  			$raOrg = $recordID['ASSIGNEE_ORGANIZATION'];
  			$raEID = $recordID['ASSIGNEE_EMPLOYEE_ID'];
  			//Update room assignment query string
  			$queryStr = 'UPDATE ' . $tableRoomAssignment
  								. ' SET ' . $queryStr
  								. 'WHERE FACILITY_CODE = ? AND ROOM_NUMBER = ? AND ASSIGNEE_ORGANIZATION = ? AND ASSIGNEE_EMPLOYEE_ID = ?';
  			//TO DO: Create 'where' string from bind array
  			$bindArrayStandardKeys = array('MOD_NETID' => array('MOD_NETID',':modnetid_bv',$userNetid,128,null),//SQLT_CHR),
																			 'FACILITY_CODE' => array('FACILITY_CODE',':faccode_bv',$facCode,4,null),//SQLT_CHR),
																			 'ROOM_NUMBER' => array('ROOM_NUMBER',':roomnum_bv',$roomNum,13,null),//SQLT_CHR),
  																		 'ASSIGNEE_ORGANIZATION' => array('ASSIGNEE_ORGANIZATION',':raorg_bv',$raOrg,10,null),//SQLT_CHR),
  											 							 'ASSIGNEE_EMPLOYEE_ID' => array('ASSIGNEE_EMPLOYEE_ID',':raeid_bv',$raEID,9,null));//SQLT_CHR));
				
  			$bindArray = array_merge($queryKeys, $bindArrayStandardKeys);
  			//Check if Room Assignment child table needs to be updated
  			if (count($updateRaChildArr) == 0) { /**No need to update room assignment child records**/
  				$arr['results']['rowsUpdated'] = makeQuery($conn, $queryStr, $bindArray);//array_merge($bindArray, $queryKeys)); //Make query and populate results array
  			} else { /**Room Assignment child records need to be updated**/
					odbc_autocommit($conn, false);
  				//Execute query for Room Assignment
  				$stid = odbc_prepare($conn, $queryStr);
					$queryVals = array();
  				foreach ($bindArray as $key => $value) {
  					//echo json_encode(array($bindArray[$key][1], $bindArray[$key][2], $bindArray[$key][3], $bindArray[$key][4]));
  					//oci_bind_by_name($stid, $bindArray[$key][1], $bindArray[$key][2], $bindArray[$key][3], $bindArray[$key][4]);
						$queryVals[] = $bindArray[$key][2]; //Add data value to array
  				}
  				$r = odbc_execute($stid, $queryVals); //Execute query, do not commit
  				if ($r === false) { //If query returned false, throw error and rollback
      			$e = odbc_errormsg($conn);
      			odbc_rollback($conn);  //Rollback changes to both tables
      			trigger_error(htmlentities($e), E_USER_ERROR);
  				} else {
  					$rowsUpdated = odbc_num_rows($stid);  //Row count
  					//Write and execute query for Room Assignment child tables
  					$validChildKeys = array('ORGANIZATION' => array('ORGANIZATION',':raorgup_bv',null,10,null),//SQLT_CHR),
  											 						'EMPLOYEE_ID' => array('EMPLOYEE_ID',':raeidup_bv',null,9,null));//SQLT_CHR));
  					//$queryStr_setVars = updateQueryStr($updateRaChildArr, $validKeys);
						$queryVars = updateQueryStr($updateRaChildArr, $validChildKeys);
						$queryStr_setVars = $queryVars[0];
						$queryKeys = $queryVars[1];
  					$childRowsUpdated = 0;
  					$bindArray = array_merge($queryKeys, $bindArrayStandardKeys);
  					//Loop through Room Assignment child tables and update identifiers
  					foreach ($raChildTables as $raChildTable) {
    					$queryStr_child = 'UPDATE ' . $raChildTable
    													. ' SET ' . $queryStr_setVars
    													. 'WHERE FACILITY_CODE = ? AND ROOM_NUMBER = ? AND ORGANIZATION = ? AND EMPLOYEE_ID = ?';
    													//TO DO: Create 'where' string from bind array
    					//echo $queryStr_child;
							$stid = odbc_prepare($conn, $queryStr_child);
							$childQueryVals = array();
    					foreach ($bindArray as $key => $value) {
    						//echo json_encode(array($bindArray[$key][1], $bindArray[$key][2], $bindArray[$key][3], $bindArray[$key][4]));
  							//oci_bind_by_name($stid, $bindArray[$key][1], $bindArray[$key][2], $bindArray[$key][3], $bindArray[$key][4]);
								$childQueryVals[] = $bindArray[$key][2]; //Add data value to array
    					}
    					$r = odbc_execute($stid, $childQueryVals); //Execute query, do not commit
    					if ($r === false) { //If query returned false, throw error and break loop
    						break;
    					} else {
    						$childRowsUpdated += odbc_num_rows($stid);  //Row count
    					}
    					
  					}
  					
  					if ($r === false) { //If query returned false, throw error and rollback
      				$e = odbc_errormsg($conn);
      				odbc_rollback($conn);  //Rollback changes to tables
      				trigger_error(htmlentities($e), E_USER_ERROR);
  					} else {
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
  			}
  		} else {
  			echo 'Invalid request.';
  			$arr['results']['msg'] = 'Invalid request.';
  			$arr['results']['rowsUpdated'] = 0;
  		}
  	}
  	
  	//Update Room Assignment Occupant
  	elseif ($kind == 'RAO') {
  		$validKeys = array('OCCUPANT_EID' => array('OCCUPANT_EID',':raoeidup_bv',null,9,null));//SQLT_CHR));
  		$queryVars = updateQueryStr($update, $validKeys);
			$queryStr = $queryVars[0];
			$queryKeys = $queryVars[1];
			
  		if ($queryStr != '') {
  			//Define variables
  			$raOrg = $recordID['ORGANIZATION'];
  			$raEID = $recordID['EMPLOYEE_ID'];
  			$raoEID = $recordID['OCCUPANT_EID'];
  			//Update room assignment occupant query string
  			$queryStr = 'UPDATE ' . $tableRoomAssignmentOccupant
  								. ' SET ' . $queryStr
  								. 'WHERE FACILITY_CODE = ? AND ROOM_NUMBER = ? AND ORGANIZATION = ? AND EMPLOYEE_ID = ? AND '.(is_null($raoEID)?'OCCUPANT_EID IS NULL ':'OCCUPANT_EID = ? ');
  			//TO DO: Create 'where' string from bind array
  			$bindArray = array('MOD_NETID' => array('MOD_NETID',':modnetid_bv',$userNetid,128,null),//SQLT_CHR),
													 'FACILITY_CODE' => array('FACILITY_CODE',':faccode_bv',$facCode,4,null),//SQLT_CHR),
													 'ROOM_NUMBER' => array('ROOM_NUMBER',':roomnum_bv',$roomNum,13,null),//SQLT_CHR),
  												 'ORGANIZATION' => array('ORGANIZATION',':raorg_bv',$raOrg,10,null),//SQLT_CHR),
  											 	 'EMPLOYEE_ID' => array('EMPLOYEE_ID',':raeid_bv',$raEID,9,null),//SQLT_CHR),
  												 'OCCUPANT_EID' => array('OCCUPANT_EID',':raoeid_bv',$raoEID,9,null));//SQLT_CHR));

  			//Make query and populate results array			
  			$arr['results']['rowsUpdated'] = makeQuery($conn, $queryStr, array_merge($queryKeys, $bindArray));
  		} else {
  			//echo 'Invalid request.';
  			$arr['results']['msg'] = 'Invalid request.';
  			$arr['results']['rowsUpdated'] = 0;
  		}
  	}
  	
  	//Update Room Assignment Use
  	elseif ($kind == 'RAU') {
  		$validKeys = array('FUNCTIONAL_USE_CODE' => array('FUNCTIONAL_USE_CODE',':raucodeup_bv',null,8,null),//SQLT_CHR),
  											 'FUNCTIONAL_USE_PERCENT' => array('FUNCTIONAL_USE_PERCENT',':rauperup_bv',null,3,null));//SQLT_INT));
  		$queryVars = updateQueryStr($update, $validKeys);
			$queryStr = $queryVars[0];
			$queryKeys = $queryVars[1];
			
  		if ($queryStr != '') {
  			//Define variables
  			$raOrg = $recordID['ORGANIZATION'];
  			$raEID = $recordID['EMPLOYEE_ID'];
  			$rauCode = $recordID['FUNCTIONAL_USE_CODE'];
  			//Update room assignment use query string
  			$queryStr = 'UPDATE ' . $tableRoomAssignmentUse 
  								. ' SET ' . $queryStr
  								. 'WHERE FACILITY_CODE = ? AND ROOM_NUMBER = ? AND ORGANIZATION = ? AND EMPLOYEE_ID = ? AND FUNCTIONAL_USE_CODE = ?'; //Room query string
  			//TO DO: Create 'where' string from bind array
  			$bindArray = array('MOD_NETID' => array('MOD_NETID',':modnetid_bv',$userNetid,128,null),//SQLT_CHR)
													 'FACILITY_CODE' => array('FACILITY_CODE',':faccode_bv',$facCode,4,null),//SQLT_CHR),
													 'ROOM_NUMBER' => array('ROOM_NUMBER',':roomnum_bv',$roomNum,13,null),//SQLT_CHR),
  												 'ORGANIZATION' => array('ORGANIZATION',':raorg_bv',$raOrg,10,null),//SQLT_CHR),
  											 	 'EMPLOYEE_ID' => array('EMPLOYEE_ID',':raeid_bv',$raEID,9,null),//SQLT_CHR),
  												 'FUNCTIONAL_USE_CODE' => array('FUNCTIONAL_USE_CODE',':raucode_bv',$rauCode,8,null));//SQLT_CHR)
  			
  			//Make query and populate results array
  			$arr['results']['rowsUpdated'] = makeQuery($conn, $queryStr, array_merge($queryKeys, $bindArray));
  		} else {
  			//echo 'Invalid request.';
  			$arr['results']['msg'] = 'Invalid request.';
  			$arr['results']['rowsUpdated'] = 0;
  		}
  	}

  	//Update Budget
  	elseif ($kind == 'RAB') {
  		//Array of columns that can be updated
  		$validKeys = array('FISCAL_YEAR_ENTERED' => array('FISCAL_YEAR_ENTERED',':bdgtfyup_bv',null,4,null),//SQLT_CHR),
  											 'BUDGET_NUMBER' => array('BUDGET_NUMBER',':bdgtnumup_bv',null,6,null),//SQLT_CHR),
  											 'PRIMARY_ROOM' => array('PRIMARY_ROOM',':bdgtprup_bv',null,1,null));//SQLT_CHR));
  		$queryVars = updateQueryStr($update, $validKeys);
			$queryStr = $queryVars[0];
			$queryKeys = $queryVars[1];
			
  		if ($queryStr != '') {
  			//Define variables
  			$raOrg = $recordID['ORGANIZATION'];
  			$raEID = $recordID['EMPLOYEE_ID'];
  			$bdgtNum = $recordID['BUDGET_NUMBER'];
  			$bdgtFy = $recordID['FISCAL_YEAR_ENTERED'];
  			//Update room assignment budget query string
  			$queryStr = 'UPDATE ' . $tableRoomsVsGrants
  								. ' SET ' . $queryStr
  								. 'WHERE FACILITY_CODE = ? AND ROOM_NUMBER = ? AND ORGANIZATION = ? AND EMPLOYEE_ID = ? AND BUDGET_NUMBER = ? AND FISCAL_YEAR_ENTERED '.(is_null($bdgtFy)?'IS NULL':'= ?');
  			//TO DO: Create 'where' string from bind array
  			$bindArray = array('MOD_NETID' => array('MOD_NETID',':modnetid_bv',$userNetid,128,null),//SQLT_CHR),
													 'FACILITY_CODE' => array('FACILITY_CODE',':faccode_bv',$facCode,4,null),//SQLT_CHR),
													 'ROOM_NUMBER' => array('ROOM_NUMBER',':roomnum_bv',$roomNum,13,null),//SQLT_CHR),
  												 'ORGANIZATION' => array('ORGANIZATION',':raorg_bv',$raOrg,10,null),//SQLT_CHR),
  											 	 'EMPLOYEE_ID' => array('EMPLOYEE_ID',':raeid_bv',$raEID,9,null),//SQLT_CHR),
  											 	 'BUDGET_NUMBER' => array('BUDGET_NUMBER',':bdgtnum_bv',$bdgtNum,6,null),//SQLT_CHR),
													 'FISCAL_YEAR_ENTERED' => array('FISCAL_YEAR_ENTERED',':bdgtfy_bv',$bdgtFy,4,null));//SQLT_CHR));
				
  			//Make query and populate results array			
  			$arr['results']['rowsUpdated'] = makeQuery($conn, $queryStr, array_merge($queryKeys, $bindArray));
  		} else {
  			//echo 'Invalid request.';
  			$arr['results']['msg'] = 'Invalid request.';
  			$arr['results']['rowsUpdated'] = 0;
  		}
  	}
  	
  	//Update Budget
  	elseif ($kind == 'BRA') {
  		//Define variables
  		$raOrg = $recordID['ORGANIZATION'];
  		$raEID = $recordID['EMPLOYEE_ID'];
  		//Array of columns that can be updated
  		$validKeys = array('FACILITY_CODE' => array('FACILITY_CODE',':faccodeup_bv',$facCode,4,null),//SQLT_CHR),
												 'ROOM_NUMBER' => array('ROOM_NUMBER',':roomnumup_bv',$roomNum,13,null),//SQLT_CHR),
												 'ORGANIZATION' => array('ORGANIZATION',':raorgup_bv',$raOrg,10,null),//SQLT_CHR),
											 	 'EMPLOYEE_ID' => array('EMPLOYEE_ID',':raeidup_bv',$raEID,9,null),//SQLT_CHR),
											 	 //'BUDGET_NUMBER' => array('BUDGET_NUMBER',':bdgtnumup_bv',null,6,null),//SQLT_CHR),
  											 'PRIMARY_ROOM' => array('PRIMARY_ROOM',':bdgtprup_bv',null,1,null));//SQLT_CHR));
  		
  		$BRAcheckRA = false; //Bool to force check of room assignment key if facility_code is changed and resulting room_number exists
  		//if the facility_code is being changed
  		//if ORGANIZATION and EMPLOYEE_ID are not Null (ROOM_NUMBER?)?
  		if (array_key_exists('FACILITY_CODE', $update)) {
  			//Check that the resulting room record exists
  			if (checkRoom($conn, $update['FACILITY_CODE'], $roomNum) == 0) {
  				//If it doesn't exist, set ROOM_NUMBER, ORGANIZATION, and EMPLOYEE_ID values to ? in update array, return ? ROOM_NUMBER, ? ORGANIZATION, and ? EMPLOYEE_ID to update UI
  				$update['ROOM_NUMBER'] = '?';
  				$update['ORGANIZATION'] = '?';
  				$update['EMPLOYEE_ID'] = '?';
  				$arr['results']['refresh'] = array('ROOM_NUMBER' => '?', 'ORGANIZATION' => '?', 'ORG_NAME' => '', 'EMPLOYEE_ID' => '?', 'EMPLOYEE_NAME' => '',  'ASSIGNEE_ROOM_PERCENT' => '');
  			} else {
  				//Room exists, but room assignment key needs to be checked in next step
  				$BRAcheckRA = true;
  			}
  		} 
  		
  		//if the room_number is being changed (but not to value '?')
  		if (((array_key_exists('ROOM_NUMBER', $update) || $BRAcheckRA) && $update['ROOM_NUMBER'] != '?' )) { //if ORGANIZATION and EMPLOYEE_ID are not Null?
  			//Check that the resulting room assignment record exists
  			$BRAroomAssignmentRecords = getRoomAssignments($conn, ($BRAcheckRA ? $update['FACILITY_CODE'] : $facCode), ($BRAcheckRA ? $roomNum : $update['ROOM_NUMBER']));
				$BRAraExists = false;
				foreach ($BRAroomAssignmentRecords as $row) {
					if ($row['ORGANIZATION'] == $raOrg && $row['EMPLOYEE_ID'] == $raEID) {
						$BRAraExists = $row;
					}
				}
				//If it does exist, return ASSIGNEE_ROOM_PERCENT value to update UI
				if ($BRAraExists !== false) {
					$arr['results']['refresh'] = array('ASSIGNEE_ROOM_PERCENT' => $BRAraExists['ASSIGNEE_ROOM_PERCENT']);
				} elseif (count($BRAroomAssignmentRecords) == 1) {
					//If it doesn't exist, but there is only one assignment record in the room set it to this assignment record
					$update['ORGANIZATION'] = $BRAroomAssignmentRecords[0]['ORGANIZATION'];
  				$update['EMPLOYEE_ID'] = $BRAroomAssignmentRecords[0]['EMPLOYEE_ID'];
  				$arr['results']['refresh'] = $BRAroomAssignmentRecords[0];
				} else {
					//If it doesn't exist, set ORGANIZATION and EMPLOYEE_ID values to ? in update array, return ? ORGANIZATION and ? EMPLOYEE_ID to update UI
					$update['ORGANIZATION'] = '?';
					$update['EMPLOYEE_ID'] = '?';
					$arr['results']['refresh'] = array('ORGANIZATION' => '?', 'ORG_NAME' => '', 'EMPLOYEE_ID' => '?', 'EMPLOYEE_NAME' => '',  'ASSIGNEE_ROOM_PERCENT' => '');
				}
  		}

  		$queryVars = updateQueryStr($update, $validKeys);
			$queryStr = $queryVars[0];
			$queryKeys = $queryVars[1];

  		if ($queryStr != '') {
  			//Define variables
  			$bdgtNum = $recordID['BUDGET_NUMBER'];
  			$bdgtFy = $recordID['FISCAL_YEAR_ENTERED'];
  			//Update room assignment budget query string
  			$queryStr = 'UPDATE ' . $tableRoomsVsGrants
  								. ' SET ' . $queryStr
  								. 'WHERE FACILITY_CODE = ? '
  								. 'AND '.(is_null($roomNum)?'ROOM_NUMBER IS NULL ':'ROOM_NUMBER = ? ')
  								. 'AND '.(is_null($raOrg)?'ORGANIZATION IS NULL ':'ORGANIZATION = ? ')
  								. 'AND '.(is_null($raEID)?'EMPLOYEE_ID IS NULL ':'EMPLOYEE_ID = ? ')
  								. 'AND BUDGET_NUMBER = ? AND FISCAL_YEAR_ENTERED '.(is_null($bdgtFy)?'IS NULL':'= ?');
  			//echo $queryStr;
  			
  			//TO DO: Create 'where' string from bind array
  			$bindArray = array('MOD_NETID' => array('MOD_NETID',':modnetid_bv',$userNetid,128,null),//SQLT_CHR),
													 'FACILITY_CODE' => array('FACILITY_CODE',':faccode_bv',$facCode,4,null),//SQLT_CHR),
													 'ROOM_NUMBER' => array('ROOM_NUMBER',':roomnum_bv',$roomNum,13,null),//SQLT_CHR),
  												 'ORGANIZATION' => array('ORGANIZATION',':raorg_bv',$raOrg,10,null),//SQLT_CHR),
  											 	 'EMPLOYEE_ID' => array('EMPLOYEE_ID',':raeid_bv',$raEID,9,null),//SQLT_CHR),
  											 	 'BUDGET_NUMBER' => array('BUDGET_NUMBER',':bdgtnum_bv',$bdgtNum,6,null),//SQLT_CHR),
  												 'FISCAL_YEAR_ENTERED' => array('FISCAL_YEAR_ENTERED',':bdgtfy_bv',$bdgtFy,4,null));//SQLT_CHR));
				
				//print_r($array_merge($queryKeys, $bindArray));
  			//Make query and populate results array
  			$arr['results']['rowsUpdated'] = makeQuery($conn, $queryStr, array_merge($queryKeys, $bindArray));
  		} else {
  			//echo 'Invalid request.';
  			$arr['results']['msg'] = 'Invalid request.';
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
	//echo json_encode($arr);
}

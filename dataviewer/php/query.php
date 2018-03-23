<?php
require_once '../../common/php/login.php';
require_once '../../common/php/common.php';

if ((!empty($_POST["json"])) && (isset($_SERVER['HTTP_UWNETID']))) {
	$userNetid = $_SERVER['HTTP_UWNETID'];
	$astraAuthz = getAstraInfo($userNetid, false); //Get ASTRA authorizations for netid
	if (hasAuthz($astraAuthz)) { //If user is authorized
  	//Process column table alias's to determine needed joins
    function getJoinArr($joinArr, $val, $from, $validKeys, $failBadTable) {
    	//Get column table alias and column name
      $fieldArr = explode('.',$val,2);
      $fieldArr = explode('(',$fieldArr[0],2);
    	if ($fieldArr[count($fieldArr)-1] != $from) { //If column table alias does not equal the from table value
    		if (array_key_exists($fieldArr[0],$validKeys['table'])) { //If column table alias is in list of valid tables
    			$joinArrIdx = $validKeys['table'][$fieldArr[0]][0];
    			if (!(isset($joinArr[$joinArrIdx]))) { //If column table alias does not already exist in list of tables to join
    				//echo 'table: '.$fieldArr[0].'.'.$fieldArr[1];
    				$joinStrArr = $validKeys['table'][$fieldArr[0]][1];
    				if (array_key_exists($from,$joinStrArr)) { //If a join string for the from table is defined
    					$joinStr = $joinStrArr[$from];
    				} elseif (array_key_exists('default',$joinStrArr)) {
    					$joinStr = $joinStrArr['default'];
    				} else {
    					echo 'No join string defined for table: '.$fieldArr[0];
    					return false;
    				}
    				$joinStr = preg_replace("/#from/",$from,$joinStr); //Set appropriate table in join string
    				$joinArr[$joinArrIdx] = $joinStr;
    			}
    		} elseif ($failBadTable) {
    			echo 'Invalid table: '.$fieldArr[0];
    			return false;
    		}
    	}
    	return $joinArr;
    }

  	//Used by getQuery to process where items
  	function getConditions($from, $keys, $validKeys, $bindArr, $joinArr) {
  		//Check if array
  		if (!(is_array($keys) && is_array($validKeys) && is_array($bindArr))) {
          return false;
      }
  		$queryStr = '';

  		//Check where condition items
  		foreach ($keys as $idx => $val) {
    		if ($idx <> 0) {
    			if (isset($val['operator'])) {
    				if (array_key_exists($val['operator'],$validKeys['operator'])) {
    					//echo ' '.$validKeys['operator'][$val['operator']][0].' ';
    					$queryStr .= ' '.$validKeys['operator'][$val['operator']][0].' ';
    				} else {
    					return false; //Invalid Operator: Operator is not in valid operators list
    				}
    			} else {
    				return false;	//Operator Required: Non-first item has no operator set
    			}
    		} elseif (isset($val['operator'])) {
    			return false; //Bad Format: First item incorrectly has an operator set
    		}
    		if (count($val['item']) == 1) {
    			//echo 'This is a condition!', PHP_EOL;
    			//var_dump($key['item'][0]);
    			$condition = $val['item'][0];
    			//if (isset($condition['field']) && isset($condition['predicate']) && isset($condition['value'])) {
    				//echo $condition['field'].' '.$condition['predicate'].' '.$condition['value'];
    				if (isset($condition['field']) && array_key_exists($condition['field'],$validKeys['where'])) {
    				  if (isset($condition['predicate']) && isset($condition['value']) && array_key_exists($condition['predicate'],$validKeys['predicate'])) {
      					//echo $validKeys['where'][$condition['field']][0].' '.$validKeys['predicate'][$condition['predicate']][0].' '.$condition['value'];
      					$bindVar = $validKeys['where'][$condition['field']];
      					$joinArr = getJoinArr($joinArr, $bindVar[0], $from, $validKeys, true); //Check table, save join string to join array
      					//Set bind variable
      					$bindVar[2] .= count($bindArr);
      					if (isset($bindVar[1])) {
      						$whereExpr = preg_replace("/#where/",$bindVar[2],$bindVar[1]).PHP_EOL;
      					} else {
      						$whereExpr = $bindVar[2];
      					}
      					$bindVar[3] = $condition['value']; //Set value to bindVar array
      					$bindArr[] = $bindVar; //Add bindVar array to bindArr array
      					//$queryStr .= $bindVar[0].' '.$validKeys['predicate'][$condition['predicate']][0].' '.$whereExpr; //Add to query string
								$queryStr .= $bindVar[0].' '.$validKeys['predicate'][$condition['predicate']][0].' '.'?'; //Add to query string
    					} elseif ($condition['field'] == 'BUDGET_ERRORS') { //Handle special budget_errors request
    						//echo 'this is Bdgt_Errs!';
    						$bindVar = $validKeys['where'][$condition['field']];
    						//$joinArr = getJoinArr($joinArr, /**$bindVar[0]**/ 'RAB', $from, $validKeys, true); //Check table, save join string to join array
    						//Handle bind variables, bind variable values, and add to bindArr array
    						$queryStr .= $bindVar[1];
    					}
    				} else {
    					//echo  'Invalid Condition: Not all condition variables are valid'
    					return false;
    				}
    			//} else {
    				//echo 'Condition Variables Required: Not all condition variables are set'
    			//	return false;
    			//}
    		} elseif (count($val['item']) > 1) {
    			//echo 'This is a group!', PHP_EOL;
    			//var_dump($key['item']);
    			$queryVars = getConditions($from, $val['item'], $validKeys, $bindArr, $joinArr);
    			if ($queryVars === false) return false;
    			$queryStr .= '('.$queryVars[0].')';
    			$bindArr = $queryVars[1];
    			$joinArr = $queryVars[2];
    		}
    	}
    	return array($queryStr,$bindArr,$joinArr);
    }

    //Process query variables to
    function getQuery($from, $keys, $validKeys, $bindArr) {
    	//Check where items for conditions, get the query's where str, bind vars array, and join str array
    	$joinArr = array(); //Initialize empty join array
    	$queryVars = getConditions($from, $keys, $validKeys, $bindArr, $joinArr);
    	if ($queryVars === false) return false;
    	$queryStr_where = $queryVars[0];
    	$bindArr = $queryVars[1];
    	$joinArr = $queryVars[2];

    	$queryStr_from = ''; //String containing SQL "from" query
    	//Check column table alias for any needed joins
    	//$columns = explode(',',$validKeys['from'][$from][1]);
    	$columns = $validKeys['from'][$from][1];
    	foreach ($columns as $idx => $val) {
    		if ($idx > 0) $queryStr_from .= ',';
    		$queryStr_from .= $val[0];
    		$joinArr = getJoinArr($joinArr, $val[0], $from, $validKeys, true);
  		}

    	//Check join array table alias for any needed joins
  		foreach ($joinArr as $idx => $val) {
  			$wordArr = explode(' ',$val);
  			foreach ($wordArr as $w_idx => $w_val) {
  				if (strpos($w_val, '.') !== false) {
  					$joinArr = getJoinArr($joinArr, $w_val, $from, $validKeys, false);
  				}
  			}
    	}
    	ksort($joinArr);
  		return array($queryStr_where,$bindArr,$joinArr,$queryStr_from);
  	}

    //Process query results
    function getResults($stid) {
    	$resultArr = array();
    	$columnIsNumeric = array('SQUARE_FEET','CAPACITY','ASSIGNEE_ROOM_PERCENT','FUNCTIONAL_USE_PERCENT'); //List of columns to be cast as integers
    	while ($row = odbc_fetch_array($stid)) {
    		$returnRow = array();
    		foreach ($row as $col => &$val) { //Reference column value (&)
    			//If column name is in list of numeric columns, cast value as integer
    			if (in_array($col,$columnIsNumeric) == true) {
    				$val = (int) $val;
    			}
    		}
    		$resultArr[] = $row;
    	}
    	return $resultArr;
    }

  	//Define return array
  	$arr = array(
  		'request' => json_decode($_POST["json"], true)); //Populate request array

  	$fromVar = $arr['request']['from'];
  	$whereVars = $arr['request']['where'];

  	$validKeys = array();
  	$validKeys['from'] = array('R' => array($tableRoom.' R',
        																		array(array("R.FACILITY_CODE"),//,SQLT_CHR),
        																					array("F.LONG_NAME"),//,SQLT_CHR),
        																					array("F.FACILITY_NUMBER"),//,SQLT_CHR),
        																					array("F.FACILITY_CODE + ' - ' + F.LONG_NAME + ' - ' + CAST(F.FACILITY_NUMBER as nvarchar) as FACDESC"),//,SQLT_CHR),
        																					array("R.FLOOR_CODE"),//,SQLT_CHR),
        																					array("R.ROOM_NUMBER"),//,SQLT_CHR),
        																					array("R.SQUARE_FEET"),//,SQLT_INT),
        																					array("R.ROOM_TYPE"),//,SQLT_CHR),
        																					array("R.ORGANIZATION"),//,SQLT_CHR),
        																					array("O.OrgName as ORG_NAME"),//,SQLT_CHR),
        																					array("R.CAPACITY"),//,SQLT_INT),
        																					array("CAST(R.CONFIRM_DATE as smalldatetime) as CONFIRM_DATE"),//,-1),
        																					array("R.CONFIRM_USER")),//,SQLT_CHR)),
        																		' ORDER BY R.FACILITY_CODE,R.FLOOR_CODE,R.ROOM_NUMBER'),
  														 'RA' => array($tableRoomAssignment.' RA',
    																					array(array("RA.FACILITY_CODE"),
          																					array("F.LONG_NAME"),//,SQLT_CHR),
          																					array("F.FACILITY_NUMBER"),//,SQLT_CHR),
        																						array("F.FACILITY_CODE + ' - ' + F.LONG_NAME + ' - ' + CAST(F.FACILITY_NUMBER as nvarchar) as FACDESC"),
        																						array("RA.ROOM_NUMBER"),
																										array("R.FLOOR_CODE"),
        																						array("R.ORGANIZATION as ROOM_ORG"),
        																						array("RA.ASSIGNEE_ORGANIZATION"),
        																						array("O.OrgName as ORG_NAME"),
        																						array("RA.ASSIGNEE_EMPLOYEE_ID"),
        																						array("E.DisplayName as EMPLOYEE_NAME"),
        																						array("RA.ASSIGNEE_ROOM_PERCENT"),
        																						array("RA.DEPT_NOTE")),
        																			' ORDER BY RA.FACILITY_CODE,RA.ROOM_NUMBER'),
  														 'B' => array($tableBudget.' B',
  														 							array(array("B.BudgetNbr as BUDGET_NUMBER"),
  														 										array("B.BienniumYear"),// B.FISCAL_YEAR"),
  					 																			array("B.BudgetName as BUDGET_NAME"),
  					 																			array("B.BudgetType as BUDGET_TYPE"),
  					 																			array("B.BudgetClass as BUDGET_CLASS"),
  																								array("B.BudgetStatus as BUDGET_STATUS"),
  																								array("B.OrgCode as ORGANIZATION"),
  																								array("B.OrgName as ORG_NAME"),
   																								array("B.PrincipalInvestigatorId as PRINCIPAL_INVESTIGATOR_ID"),
   																								array("B.PrincipalInvestigator as PI_NAME"),
   																								array("B.GrantContractNbr as GRANT_CONTRACT_NUMBER"),
   																								array("CAST(B.CurrentPeriodBeginDate as date) as GRANT_CURRENT_PERIOD_BEGIN"),
   																								array("CAST(B.CurrentPeriodEndDate as date) as GRANT_CURRENT_PERIOD_END")),
   																					' ORDER BY B.BudgetNbr'));
  	if (count($whereVars) > 0 && array_key_exists($fromVar,$validKeys['from'])) { //Query must have at least one where and from table must be valid
    	$validKeys['table'] = array('F' => array(0,array('default' => 'LEFT JOIN '.$tableFacility.' F ON #from.FACILITY_CODE = F.FACILITY_CODE ')),
    												'R' => array(3,array('RA' => 'LEFT JOIN '.$tableRoom.' R ON RA.FACILITY_CODE = R.FACILITY_CODE AND RA.ROOM_NUMBER = R.ROOM_NUMBER ')),
    												'RA' => array(7,array('R' => 'LEFT JOIN '.$tableRoomAssignment.' RA ON R.FACILITY_CODE = RA.FACILITY_CODE AND R.ROOM_NUMBER = RA.ROOM_NUMBER ')),
    												'RAO' => array(13,array('R' => 'LEFT JOIN '.$tableRoomAssignmentOccupant.' RAO ON R.FACILITY_CODE = RAO.FACILITY_CODE AND R.ROOM_NUMBER = RAO.ROOM_NUMBER ','RA' => 'LEFT JOIN '.$tableRoomAssignmentOccupant.' RAO ON RA.FACILITY_CODE = RAO.FACILITY_CODE AND RA.ROOM_NUMBER = RAO.ROOM_NUMBER AND RA.ASSIGNEE_ORGANIZATION = RAO.ORGANIZATION AND RA.ASSIGNEE_EMPLOYEE_ID = RAO.EMPLOYEE_ID ')),
    												'RAU' => array(8,array('R' => 'LEFT JOIN '.$tableRoomAssignmentUse.' RAU ON R.FACILITY_CODE = RAU.FACILITY_CODE AND R.ROOM_NUMBER = RAU.ROOM_NUMBER ','RA' => 'LEFT JOIN '.$tableRoomAssignmentUse.' RAU ON RA.FACILITY_CODE = RAU.FACILITY_CODE AND RA.ROOM_NUMBER = RAU.ROOM_NUMBER AND RA.ASSIGNEE_ORGANIZATION = RAU.ORGANIZATION AND RA.ASSIGNEE_EMPLOYEE_ID = RAU.EMPLOYEE_ID ')),
    												'RAB' => array(11,array('R' => 'LEFT JOIN '.$tableRoomsVsGrants.' RAB ON R.FACILITY_CODE = RAB.FACILITY_CODE AND R.ROOM_NUMBER = RAB.ROOM_NUMBER ','RA' => 'LEFT JOIN '.$tableRoomsVsGrants.' RAB ON RA.FACILITY_CODE = RAB.FACILITY_CODE AND RA.ROOM_NUMBER = RAB.ROOM_NUMBER AND RA.ASSIGNEE_ORGANIZATION = RAB.ORGANIZATION AND RA.ASSIGNEE_EMPLOYEE_ID = RAB.EMPLOYEE_ID ','B' => 'LEFT JOIN '.$tableRoomsVsGrants.' RAB ON B.BUDGET_NUMBER = RAB.BUDGET_NUMBER ')),
    												'RT' => array(4,array('R' => 'LEFT JOIN '.$tableRoomType.' RT ON R.ROOM_TYPE = RT.ROOM_TYPE ','RA' => 'LEFT JOIN '.$tableRoomType.' RT ON R.ROOM_TYPE = RT.ROOM_TYPE ')),
    												'O' => array(15,array('R' => 'LEFT JOIN ' . $tableOrg . ' O ON R.ORGANIZATION = O.OrgCode ','RA' => 'LEFT JOIN ' . $tableOrg . ' O ON RA.ASSIGNEE_ORGANIZATION = O.OrgCode ')),
    												'OD' => array(16,array('R' => 'LEFT JOIN '.$tableOrgDept.' OD ON SUBSTRING(R.ORGANIZATION,1,7) = OD.ORG_DEPT ','RA' => 'LEFT JOIN '.$tableOrgDept.' OD ON SUBSTRING(RA.ASSIGNEE_ORGANIZATION,1,7) = OD.ORG_DEPT ')),
    												'E' => array(14,array('RA' => 'LEFT JOIN ' . $tableEmployee . ' E ON RA.ASSIGNEE_EMPLOYEE_ID = E.EmployeeID ')));

    	$validKeys['where'] = array('FACILITY_CODE' => array($fromVar.'.FACILITY_CODE',null,':rfac_',null,4,null),//,SQLT_CHR),
      														'R.FLOOR_CODE' => array('R.FLOOR_CODE',null,':rflr_',null,13,null),//,SQLT_CHR),
      														'ROOM_NUMBER' => array($fromVar.'.ROOM_NUMBER',null,':rnum_',null,13,null),//,SQLT_CHR),
      														'R.SQUARE_FEET' => array('R.SQUARE_FEET',null,':rsft_',null,6,null),//,SQLT_INT),
      														'R.ORG7' => array('SUBSTRING(R.ORGANIZATION,1,7)',null,':rdpt_',null,8,null),//,SQLT_CHR),
      														'R.ORGANIZATION' => array('R.ORGANIZATION',null,':rorg_',null,10,null),//,SQLT_CHR),
    															'R.ROOM_TYPE' => array('R.ROOM_TYPE',null,':rrmt_',null,3,null),//,SQLT_CHR),
    															'R.CAPACITY' => array('R.CAPACITY',null,':rcap_',null,4,null),//,SQLT_INT),
    															'R.CONFIRM_USER' => array('R.CONFIRM_USER',null,':rtcu_',null,-1,null),//,SQLT_CHR),
    															'R.CONFIRM_DATE' => array("TRUNC(R.CONFIRM_DATE)","TO_DATE(#where,'YYYY/FMMM/DD')",':rtcd_',null,10,null),//,SQLT_CHR),
    															'RA.ASSIGNEE_ORGANIZATION' => array('RA.ASSIGNEE_ORGANIZATION',null,':raorg_',null,10,null),//,SQLT_CHR),
    															'RA.ASSIGNEE_EMPLOYEE_ID' => array('RA.ASSIGNEE_EMPLOYEE_ID',null,':raemp_',null,9,null),//,SQLT_CHR),
    															'RA.ASSIGNEE_ROOM_PERCENT' => array('RA.ASSIGNEE_ROOM_PERCENT',null,':raper_',null,3,null),//,SQLT_INT),
    															'RAO.OCCUPANT_ID' => array('RAO.OCCUPANT_EID',null,':raoem_',null,9,null),//,SQLT_CHR),
    															'RAU.FUNCTIONAL_USE_CODE' => array('RAU.FUNCTIONAL_USE_CODE',null,':rauuc_',null,8,null),//,SQLT_CHR),
    															'RAU.FUNCTIONAL_USE_PERCENT' => array('RAU.FUNCTIONAL_USE_PERCENT',null,':rauup_',null,3,null),//,SQLT_INT),
    															'RAB.BUDGET_NUMBER' => array('RAB.BUDGET_NUMBER',null,':raobd_',null,6,null),//,SQLT_INT),
    															'RT.SPACE_CATEGORY' => array('RT.SPACE_CATEGORY',null,':rtsc_',null,20,null),//,SQLT_CHR),
    															'B.BUDGET_NUMBER' => array('B.BudgetNbr',null,':bbn_',null,6,null),//,SQLT_INT),
    															'B.BUDGET_TYPE' => array('B.BudgetType',null,':bty_',null,1,null),//,SQLT_INT),
    															'B.BUDGET_CLASS' => array('B.BudgetClass',null,':bcl_',null,1,null),//,SQLT_INT),
    															'B.BUDGET_STATUS' => array('B.BudgetStatus',null,':bst_',null,1,null),//,SQLT_INT),
    															'B.PRINCIPAL_INVESTIGATOR_ID' => array('B.PrincipalInvestigatorId',null,':bpi_',null,9,null),//,SQLT_CHR),
    															'B.ORGANIZATION' => array('B.OrgCode',null,':borg_',null,10,null),//,SQLT_CHR),
    															'B.GRANT_CONTRACT_NUMBER' => array('B.GrantContractNbr',null,':bgcn_',null,-1,null),//,SQLT_CHR),
    															'B.GRANT_CURRENT_PERIOD_BEGIN' => array("TRUNC(B.CurrentPeriodBeginDate)","TO_DATE(#where,'YYYY/FMMM/DD')",':bbeg_',null,10,null),//,SQLT_CHR),
    															'B.GRANT_CURRENT_PERIOD_END' => array("TRUNC(B.CurrentPeriodEndDate)","TO_DATE(#where,'YYYY/FMMM/DD')",':bend_',null,10,null),//,SQLT_CHR),
    															'BUDGET_ERRORS' => array(""," B.BudgetNbr IN (SELECT BudgetNbr FROM ".$tableUnasBdgt.")",null,null,null)
    															);
    	$validKeys['operator'] = array('AND' => array('AND'),
    																 'OR' => array('OR'));
    	$validKeys['predicate'] = array('=' => array('='),
    																	'<>' => array('<>'),
    																	'>' => array('>'),
    																	'<' => array('<'),
    																	'LIKE' => array('LIKE'),
    																	'NOT LIKE' => array('NOT LIKE'));

    	$conn = createConn($db_username,$db_password,$db_server,$db_database);  //Connection property variables defined in login.php

    	$returnArr = getQuery($fromVar, $whereVars, $validKeys, array());
    	//var_dump($returnArr);
    	if ($returnArr) {
    		$qColumns = $returnArr[3];
    		$qTable = $validKeys['from'][$fromVar][0];
    		$qJoins = implode(' ',$returnArr[2]);
    		$qWheres = $returnArr[0];
    		$qOrder = $validKeys['from'][$fromVar][2];
        $bindArray = $returnArr[1];
        $queryStr = 'SELECT DISTINCT '.$qColumns
        					. ' FROM '.$qTable
        					. ' '.$qJoins
        					. ' WHERE '.$qWheres
        					//. ' AND ROWNUM <= 1000 '
        					. $qOrder;
        					//. ' ORDER BY '.$fromVar.'.FACILITY_CODE,'.$fromVar.'.ROOM_NUMBER';


        //echo $queryStr;
        $stid = odbc_prepare($conn, $queryStr); //Process Query
        //Bind params to query
				$finalBindArray = array();
        foreach ($bindArray as $key => $value) {
        	//echo json_encode(array($bindArray[$key][2], $bindArray[$key][3], $bindArray[$key][4], $bindArray[$key][5]));
        	//oci_bind_by_name($stid, $bindArray[$key][2], $bindArray[$key][3], $bindArray[$key][4], $bindArray[$key][5]);
					$finalBindArray[] = $bindArray[$key][3]; //Add value to bindArray
        }
        //Execute query
        if (odbc_execute($stid, $finalBindArray)) {
        	$arr['results'] = getResults($stid);
        	echo json_encode($arr['results']);
  			}
  			//Clean up
        odbc_free_result($stid);
				odbc_close($conn);
      } else {
      	echo '[]';
      }
  	} else {
  		echo '[]';
  	}
  } else {
  	$arr['results']['msg'] = array(
  		'text' => 'Not authorized.',
  		'type' => 'failure');
  	echo json_encode($arr['results']);
  }
}

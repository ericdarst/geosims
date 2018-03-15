<?php
//Define return array
$arr = array(
	//'request' => $_GET["q"],
	'items' => array() );

if (isset($_GET["q"]) && isset($_SERVER['HTTP_UWNETID'])) {
  require_once 'common.php';
  $userNetid = $_SERVER['HTTP_UWNETID'];
	$astraAuthz = getAstraInfo($userNetid, false); //Get ASTRA authorizations for netid
	if (hasAuthz($astraAuthz)) { //If user is authorized
	  require_once 'login.php';
  	$request = $_GET["q"]; //The requested search string
  	if (isset($_GET["qField"])) {
  		$conn = createConn($db_username,$db_password,$db_server,$db_database);  //Connection property variables defined in login.php
  		$field = $_GET["qField"]; //The requested search string
    	if ($field == 'FACILITY_CODE') { //Facility lookup
    		$arr['identifier'] = 'FACILITY_CODE';
				$bindArray = array();
      	//Query string.  Results limited to 1000 entries.
      	$queryStr = "SELECT TOP 1000 FACILITY_CODE, FACILITY_CODE + ' - ' + LONG_NAME + ' - ' + CAST(FACILITY_NUMBER as nvarchar) as DESCR "
      					  . "FROM " . $tableFacility . " "
      					  . "WHERE (FACILITY_TYPE = 'BLDG' OR FACILITY_TYPE = 'AGGR') "
        					. "AND STATUS = 'A' ";
        if ($request != '') {
					$queryStr .= "AND PATINDEX('%'+?+'%',FACILITY_CODE + ' - ' + LONG_NAME + ' - ' + CAST(FACILITY_NUMBER as nvarchar)) != 0 "; //Query on search string if search string is defined
					$bindArray[] = $request;
				}
        $queryStr .= "ORDER BY FACILITY_CODE ASC";
        $stid = odbc_prepare($conn, $queryStr);
        //if ($request != '') oci_bind_by_name($stid,":reqVal_bv",$request); //Bind query variable if search string is defined
				
      } else if ($field == 'ROOM_NUMBER' && isset($_GET["FACILITY_CODE"])) { //Room lookup
      	$facCode = $_GET["FACILITY_CODE"];
      	$arr['identifier'] = 'ROOM_NUMBER';
      	//$request = '(^[[:alpha:]]+|^)'.$request; //RegExp
				$bindArray = array($facCode);
      	//Query string.  Results limited to 1000 entries.
      	$queryStr = "SELECT TOP 1000 ROOM_NUMBER, ROOM_NUMBER + ' (' + R.ROOM_TYPE + ' - ' + RT.PRIMARY_USE + ', ' + CAST(SQUARE_FEET as nvarchar) + ' sqft)' as DESCR "
      					  . "FROM " . $tableRoom . " R "
      					  . "LEFT JOIN " . $tableRoomType . " RT ON R.ROOM_TYPE = RT.ROOM_TYPE "
      					  . "WHERE FACILITY_CODE = ? ";
      	if ($request != '') {
					$queryStr .= "AND PATINDEX('%'+?+'%',ROOM_NUMBER) != 0 ";
					$bindArray[] = $request;
				}
      	$queryStr .= "ORDER BY FLOOR_CODE, ROOM_NUMBER ASC";
        $stid = odbc_prepare($conn, $queryStr);
      } else if ($field == 'ROOM_ASSIGNMENT' && isset($_GET["FACILITY_CODE"]) && isset($_GET["ROOM_NUMBER"])) { //Room assignment lookup
      	$facCode = $_GET["FACILITY_CODE"];
      	$roomNum = $_GET["ROOM_NUMBER"];
      	$arr['identifier'] = 'VALUE';
				$bindArray = array($facCode, $roomNum);
      	//Query string.  Results limited to 1000 entries.
      	$queryStr = "SELECT TOP 100"
									. "RA.ASSIGNEE_ORGANIZATION + ',' + RA.ASSIGNEE_EMPLOYEE_ID  + ',' + CAST(RA.ASSIGNEE_ROOM_PERCENT as varchar) AS VALUE,"
									. "RA.ASSIGNEE_ORGANIZATION + ' - ' + ISNULL(RTRIM(O.OrgName),'') + ', ' + RA.ASSIGNEE_EMPLOYEE_ID + ' - ' + ISNULL(RTRIM(E.DisplayName),'') + ', ' + CAST(RA.ASSIGNEE_ROOM_PERCENT as varchar) + '%' AS DESCR,"
									. "RA.ASSIGNEE_ORGANIZATION,"
									. "RTRIM(O.OrgName) as ORG_NAME,"
									. "RA.ASSIGNEE_EMPLOYEE_ID,"
									. "RTRIM(E.DisplayName) AS EMPLOYEE_NAME,"
									. "RA.ASSIGNEE_ROOM_PERCENT "
									. "FROM " . $tableRoomAssignment . " RA "
									. "LEFT JOIN " . $tableOrg . " O ON RA.ASSIGNEE_ORGANIZATION = O.OrgCode "
									. "LEFT JOIN " . $tableEmployee . " E ON RA.ASSIGNEE_EMPLOYEE_ID = E.EmployeeID "
									. "WHERE RA.FACILITY_CODE = ? "
									. "AND RA.ROOM_NUMBER = ? ";
				if ($request != '') {
					$queryStr .= "AND PATINDEX('%'+?+'%',RA.ASSIGNEE_ORGANIZATION + ' - ' + O.OrgName + ', ' + RA.ASSIGNEE_EMPLOYEE_ID + ' - ' + RTRIM(E.DisplayName) + ', ' + CAST(RA.ASSIGNEE_ROOM_PERCENT as varchar) + '%') !=0 "; //Query on search string if search string is defined
					$bindArray[] = $request;
				}
				$queryStr .= "ORDER BY ASSIGNEE_ROOM_PERCENT DESC";
      	$stid = odbc_prepare($conn, $queryStr);
      }


  		if (isset($queryStr) && isset($bindArray)) {
      	//$stid = oci_parse($conn, $queryStr);
      	//if ($request != '') oci_bind_by_name($stid,":reqVal_bv",$request); //Bind query variable if search string is defined
      	odbc_execute($stid, $bindArray);
      	$arr['items'] = processQuery($stid);
      	odbc_free_result($stid);
      }
    	odbc_close($conn);
    }
  }
}

echo json_encode($arr);

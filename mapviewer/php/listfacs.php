<?php
if (isset($_GET['FACNUM']) && isset($_SERVER['HTTP_UWNETID'])) {
	require_once '../../common/php/common.php';
	$userNetid = $_SERVER['HTTP_UWNETID'];
	//$astraAuthz = getAstraInfo($userNetid, false); //Get ASTRA authorizations for netid
	//if (hasAuthz($astraAuthz)) { //If user is authorized
  	require_once '../../common/php/login.php';
  	//Define response header
  	Header("Cache-Control: max-age=".$queryCache_MaxTime.",public");
    //Define return array
    $arr = array(
    	'request' => array(),
    	'results' => array());
    $arr['request']['FACNUM'] = $_GET['FACNUM'];
  	
  	$conn = createConn($db_username,$db_password,$db_server,$db_database);  //Connection property variables defined in login.php
  	
  	/**if (isset($arr['request'])) {
  		$facNum = $arr['request'];
  		$stid = oci_parse($conn, "SELECT FACILITY_NUMBER, SITE, FACILITY_NUMBER || ' - ' || FACILITY_CODE || ' - ' || LONG_NAME as FACDESC FROM BLG.FACILITY_TABLE WHERE FACILITY_NUMBER = :facnum_bv");
  		oci_bind_by_name($stid, ":facnum_bv", $facNum, -1);
  	} else {**/
  		$stid = odbc_prepare($conn, "SELECT FACILITY_NUMBER, SITE, FACILITY_CODE + ' - ' + LONG_NAME + ' - ' + CAST(FACILITY_NUMBER as nvarchar) as FACDESC FROM " . $tableFacility . " WHERE WEB_PLAN = 'T' ORDER BY FACILITY_CODE ASC");
  	//}
  	odbc_execute($stid, array());

  	$arr['results'] = processQuery($stid);

  	odbc_free_result($stid);
  	odbc_close($conn);
  	
  	echo json_encode($arr);
  //} else {
  //	$arr['results']['msg'] = array(
  //		'text' => 'Not authorized.',
  //		'type' => 'failure');
  //	echo json_encode($arr['results']);
  //}
}

?>

<?php
/**require_once 'login.php';
require_once 'common.php';

if (!empty($_POST["json"])) {
  //Define return array
  $arr = array(
  	'request' => json_decode($_POST["json"], true),
  	'results' => array() );

	$conn = createConn($db_username,$db_password,$db_hostname);  //Connection property variables defined in login.php
	
	//if (isset($arr['request'])) {
		//$facNum = $arr['request'];
		//$stid = oci_parse($conn, "SELECT FACILITY_NUMBER, SITE, FACILITY_NUMBER || ' - ' || FACILITY_CODE || ' - ' || LONG_NAME as FACDESC FROM BLG.FACILITY_TABLE WHERE FACILITY_NUMBER = :facnum_bv");
		//oci_bind_by_name($stid, ":facnum_bv", $facNum, -1);
	//} else {
		$stid = oci_parse($conn, "SELECT FACILITY_NUMBER, SITE, FACILITY_CODE || ' - ' || LONG_NAME || ' - ' || FACILITY_NUMBER as FACDESC FROM " . $tableFacility . " WHERE WEB_PLAN = 'T' ORDER BY FACILITY_CODE ASC");
	//}
	oci_execute($stid);

	$arr['results'] = processQuery($stid);

	oci_free_statement($stid);
	oci_close($conn);
}

echo json_encode($arr);**/

?>

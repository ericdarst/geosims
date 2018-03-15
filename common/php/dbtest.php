<?php	
	$server = 'geosimsdb\MSSQLSERVER';
	$connectionInfo = array( "Database"=>"geosims", "UID"=>"sa", "PWD"=>"3_.wD4&|mk-9");
	$conn = sqlsrv_connect( $server, $connectionInfo);

	if( $conn ) {
		echo "Connection established.<br />";
	}else{
		echo "Connection could not be established.<br />";
		die( print_r( sqlsrv_errors(), true));
	}
?>
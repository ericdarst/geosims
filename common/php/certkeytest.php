<?php
$cert = file_get_contents('.\baptistin-client.crt');
$key = file_get_contents('.\baptistin-client.key');
if (openssl_x509_check_private_key($cert, $key)) {
  print("Cert and key matched!\n");
} else {
  print("Something has gone wrong!\n");
}
?>

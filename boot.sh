sudo mount /dev/sda2 /mnt
node /home/mendel/repos/BackupServer/index.js & node /home/mendel/repos/AvailabilityTest/index.js
/usr/sbin/ddclient -daemon 300 -syslog

#!/bin/sh
rm -f tabcontrol*.xpi
VER=`grep 'em:version' install.rdf | sed 's/[^0-9.]//g'`

echo CREATING: tabcontrol-${VER}.xpi

zip -9 tabcontrol-${VER}.xpi \
	`find . -type d -name .svn -prune -false -o -type f -a -not -name package.sh`

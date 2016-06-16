
#./sca.js login -u hayashis -p password
#./sca.js login --username hayashis

#./sca.js resource ls

#./sca.js workflow ls

#./sca.js cp 57070fe139b1a0103ec2a86b 56f54d88469691f86d5ceab3

freesurfer_instid=570e923ff6300c3f6c615e45
freesurfer_taskid=57158d4322a51c7439016685
osg_resourceid=56f54d88469691f86d5ceab3
../sca.js task stage $freesurfer_instid $freesurfer_taskid $osg_resourceid


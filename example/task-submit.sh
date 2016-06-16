
#pick instance to submit your task under
#../sca.js instance ls

#then submit task
../sca.js task submit 5711494a5e100f81357ade1d soichih/sca-product-raw -c '
{
    "download": [
        {
            "url": "http://xd-login.opensciencegrid.org/scratch/hayashis/life/life_demo_data.tar.gz",
            "dir": "download"
        }
    ]
}'
 
#then monitor a task
#../sca.js task show 57485df3931413db01fcaa82

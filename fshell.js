const {mkdir,writeFile,rmdir,unlink,existsSync,createReadStream,createWriteStream,readdir,rename}=require('fs');
const {exec}=require('child_process');
const stdconst={
     process:process
    ,textclr:15
    ,cursorclr:8
    ,cwdclr:2
    ,fileclr:6
    ,dirclr:5
    ,errclr:1
    ,history:100
    ,escape:'\x1b'
    ,onExit:function(code=0){}
    ,onKey:function(key={sequence:'',name:'',ctrl:false,meta:false,shift:false}){}
};
const fshell=(config=stdconst)=>{
    if(config!==stdconst)for(let i in stdconst)if(config[i]===undefined||typeof(config[i])!==typeof(stdconst[i]))config[i]=stdconst[i];
    let Emitter=require("events").EventEmitter;
    if((config.process instanceof Emitter&&typeof(config.process.exit)==='function')
    &&(config.process.stdout instanceof Emitter&&typeof(config.process.stdout.write)==='function')
    &&(config.process.stdin instanceof Emitter&&typeof(config.process.stdin.read)==='function')){
        let cmds={},flags={};
        let proot={line:(config.cwdclr>-1)?'~'+config.process.cwd()+'> ':'',font:config.cwdclr,root:true,func:(res)=>{
            console.log(config.font(config.cwdclr)+proot.line+config.font(config.textclr)+res);
            config.cmd(res);
            proot.line=(config.cwdclr>-1)?'~'+config.process.cwd()+'> ':'~>';
        }};
        //===========================================================================================================
        let spaceitems=(arr,msg='',clr,altclr,clrfind,findpos=0,altspc='   ')=>{
            for(let i=0,cnt=0;i<arr.length;i++){
                if(cnt+arr[i].length+3>=config.process.stdout.columns-1){msg+='\n';cnt=0;}
                msg+=altspc;
                if(clr){
                    if((clrfind&&arr[i][findpos>-1?findpos:arr[i].length-1]===clrfind)||clrfind===undefined)msg+=config.font(clr);
                    else if(altclr)msg+=config.font(altclr);
                }
                msg+=arr[i];
                cnt+=3+arr[i].length;
            }
            return msg;
        };
        let parseargs=(arg)=>{
            let calls=[{args:[],flag:{}}];
            for(let i=0,temp='',q='';i<arg.length;i++){
                if(arg[i]==='"'||arg[i]==='\''){
                    if(q.length<1)q=arg[i];
                    else if(arg[i]===q)q='';
                }
                if((i===0||(arg[i-1]===' '||arg[i-1]===','))&&arg[i]==='-'&&q.length<1&&i<arg.length-1){
                    let optflag=false;
                    for(let o in flags)
                        if(arg.substr(i+1,o.length)===o){
                            optflag=true;
                            calls[calls.length-1].flag[o]=true;
                            i++;
                            break;
                        }
                    if(!optflag)temp+=arg[i];
                }
                else if(arg[i]===' '&&q.length<1){
                    if(temp.length>0){
                        calls[calls.length-1].args[calls[calls.length-1].args.length]=temp;
                        temp='';
                        while(arg[i+1]===' ')i++;
                    }
                }
                else if((arg[i]===','&&q.length<1)||i===arg.length-1){
                    if(i===arg.length-1&&arg[i]!==','&&arg[i]!==' '&&arg[i]!=='\''&&arg[i]!=='"')temp+=arg[i];
                    if(temp.length>0)calls[calls.length-1].args[calls[calls.length-1].args.length]=temp;
                    temp='';
                    if(i<arg.length-1)calls[calls.length]={args:[],flag:{}};
                }
                else if(arg[i]!=='\''&&arg[i]!=='"')temp+=arg[i];
            }
            return calls;
        };
        let parsecmds=(tcmd)=>{
            tcmd=tcmd.trim();
            let cmdarr=[{cmd:'',calls:[]}];
            for(let i=0,q='',targs='',sw=false;i<tcmd.length;i++){
                if(tcmd[i]==='"'||tcmd[i]==='\''){
                    if(q.length<1)q=tcmd[i];
                    else if(tcmd[i]===q)q='';
                }
                if(q.length<1&&tcmd[i]==='|'){
                    cmdarr[cmdarr.length-1].pipe=true;
                    cmdarr[cmdarr.length-1].calls=parseargs(targs);
                    cmdarr[cmdarr.length]={cmd:'',calls:[]};
                    targs='';
                    sw=false;
                }
                else if(q.length<1&&tcmd[i]==='&'){
                    if(tcmd[i+1]==='&'){
                        i++;
                        cmdarr[cmdarr.length-1].and=true;
                    }
                    cmdarr[cmdarr.length-1].calls=parseargs(targs);
                    cmdarr[cmdarr.length]={cmd:'',calls:[]};
                    targs='';
                    sw=false;
                }
                else if(q.length<1&&tcmd[i]===' '&&!sw){
                    if(cmdarr[cmdarr.length-1].cmd.length>0){
                        if(cmdarr[cmdarr.length-1].cmd.toLowerCase()==='echo'){
                            cmdarr[cmdarr.length-1].echoall=true;
                            cmdarr[cmdarr.length-1].cmd='';
                        }
                        else if(cmdarr[cmdarr.length-1].cmd.toLowerCase()==='echo-in'){
                            cmdarr[cmdarr.length-1].echoin=true;
                            cmdarr[cmdarr.length-1].cmd='';
                        }
                        else if(cmdarr[cmdarr.length-1].cmd.toLowerCase()==='echo-out'){
                            cmdarr[cmdarr.length-1].echoout=true;
                            cmdarr[cmdarr.length-1].cmd='';
                        }
                        //...
                        else{
                            sw=true;
                            let tp=i;
                            while(tcmd[i]===' ')i++;
                            if(tp<i)i--;
                        }
                    }
                }
                else if(sw===true)targs+=tcmd[i];
                else{if(tcmd[i]!=='\''&&tcmd[i]!=='"')cmdarr[cmdarr.length-1].cmd+=tcmd[i];}
                if(i===tcmd.length-1)cmdarr[cmdarr.length-1].calls=parseargs(targs);
            }
            return cmdarr;
        };
        //===========================================================================================================
        config.cmd=function(cmd=''){
            for(let i=0;i<arguments.length;i++){
                let pcmd=parsecmds(arguments[i]);
                for(let p=0;p<pcmd.length;p++){
                    if(cmds[pcmd[p].cmd]===undefined)pcmd[p].error='CMDNOENT';
                    else{
                        pcmd[p].returns=[];
                        pcmd[p].returns.length=pcmd[p].calls.length;
                        pcmd[p].cnt=pcmd[p].calls.length;
                        for(let c=0;c<pcmd[p].calls.length;c++)pcmd[p].calls[c].end=(line)=>{
                            if(pcmd[p].echoall||pcmd[p].echoout){
                                let msg='['+pcmd[p].cmd+'-'+c+'](',tarr=line.split('\n');
                                if(tarr.length===1)msg+=tarr[0]+')';
                                else if(tarr.length>1)msg+='\n'+spaceitems(tarr)+'\n)';
                                console.log(msg);
                            }
                            pcmd[p].returns[pcmd[p].calls[c].index]=line;
                            if((pcmd[p].pipe||pcmd[p].and)&&p<pcmd.length-1&&--pcmd[p].cnt===0&&pcmd[p+1].error===undefined)
                                for(let n=0;n<pcmd[p+1].calls.length;n++){
                                    pcmd[p+1].calls[n].index=n;
                                    if(n>0||pcmd[p].and)cmds[pcmd[p+1].cmd](pcmd[p+1].calls[n].flag,pcmd[p+1].calls[n].end,...pcmd[p+1].calls[n].args);
                                    else cmds[pcmd[p+1].cmd](pcmd[p+1].calls[n].flag,pcmd[p+1].calls[n].end,...pcmd[p].returns,...pcmd[p+1].calls[n].args);
                                }
                            return line;
                            }
                        }
                }
                for(let p=0;p<pcmd.length;p++){
                    if(pcmd[p].error||pcmd[p].cmd.length<1)config.error('cmd','-2C',pcmd[p].error,pcmd[p].cmd,' Command not found');
                    else if((p===0||(pcmd[p-1].pipe===undefined&&pcmd[p-1].and===undefined)))
                        for(let c=0;c<pcmd[p].calls.length;c++){
                            if(pcmd[p].echoall||pcmd[p].echoin){
                                let msg='['+pcmd[p].cmd+'-'+c+'](';
                                if(pcmd[p].calls[c].args.length===1)msg+=pcmd[p].calls[c].args[0]+')';
                                else if(pcmd[p].calls[c].args.length>1)msg+='\n'+spaceitems(pcmd[p].calls[c].args)+'\n)';
                                console.log(msg);
                            }
                            pcmd[p].calls[c].index=c;
                            cmds[pcmd[p].cmd](pcmd[p].calls[c].flag,pcmd[p].calls[c].end,...pcmd[p].calls[c].args);
                        }
                }
            }
        };
        config.addCmd=function(cmd={name:'',func:(args)=>{}}){
            for(let i=0;i<arguments.length;i++)
                if(typeof(arguments[i])==='object'&&typeof(arguments[i].name)==='string'&&typeof(arguments[i].func)==='function'
                &&cmds[arguments[i].name]===undefined)cmds[arguments[i].name]=arguments[i].func;
        };
        config.renameCmd=function(cmd='',name=''){
            for(let i=0;i<arguments.length;i+=2)if(arguments[i]&&arguments[i].length>0&&arguments[i+1]&&arguments[i+1].length>0&&cmds[arguments[i]]){
                cmds[arguments[i+1]]=cmds[arguments[i]];
                delete cmds[arguments[i]];
            }
        };
        config.delCmd=function(cmd=''){
            for(let i=0;i<arguments.length;i++)if(cmds[arguments[i]])delete cmds[arguments[i]];
        };
        config.getCmds=function(){return Object.keys(cmds);};
        config.addFlag=function(flag=''){
            for(let i=0;i<arguments.length;i++)if(arguments[i]&&arguments[i].length>0&&flags[arguments[i]]===undefined)flags[arguments[i]]=false;
        };
        config.delFlag=function(flag=''){
            for(let i=0;i<arguments.length;i++)if(arguments[i]&&arguments[i].length>0&&flags[arguments[i]]!==undefined)delete flags[arguments[i]];
        };
        config.getFlags=function(){return Object.keys(flags);};
        config.error=function(cmd='',errno='',code='',path='',msg=''){
            if(typeof(cmd)!=='object'){
                if(msg.length>0){
                    let col=msg.indexOf(':'),comma=msg.indexOf(',');
                    msg=msg.substring(((col>-1)?col+1:0),((comma>-1)?comma:msg.length));
                }
            }
            else{
                cmd=cmd.cmd||'';
                errno=cmd.errno||'';
                code=cmd.code||'';
                path=cmd.path||'';
                if(cmd.message){
                    let col=cmd.message.indexOf(':'),comma=cmd.message.indexOf(',');
                    msg=cmd.message.substring(((col>-1)?col+1:0),((comma>-1)?comma:cmd.message.length));
                }
            }
            console.log(
                 config.font(config.errclr)+'(!)['+cmd+'] '
                +config.escape+'[0m'+errno
                +config.font(config.errclr)+' : '+config.escape+'[0m'+code
                +config.font(config.errclr)+' ~> \''+config.escape+'[0m'+path
                +config.font(config.errclr)+'\' ~>'+config.escape+'[0m'+msg
            );
            return code;
        };
        //===========================================================================================================
        config.addFlag('about','last','r','x');
        config.addCmd(
             {//---.cwdclr---------------------------------------------------------------------------
                name:'.cwdclr'
                ,func:(flag,end,line)=>{
                    if(flag.about)console.log('~> Set cwd color code: [.cwdclr] [(int)]');
                    else{
                        let int=parseInt(line);
                        if(int>-1&&int<256){config.cwdclr=int;proot.font=int;}
                        end(int);
                    }
                }
            }
            ,{//---.textclr---------------------------------------------------------------------------
                name:'.textclr'
                ,func:(flag,end,line)=>{
                    if(flag.about)console.log('~> Set stdin text color code: [.textclr] [(int)]');
                    else{
                        let int=parseInt(line);
                        if(int>-1&&int<256)config.textclr=int;
                        end(int);
                    }
                }
            }
            ,{//---.cursorclr---------------------------------------------------------------------------
                name:'.cursorclr'
                ,func:(flag,end,line)=>{
                    if(flag.about)console.log('~> Set stdin cursor color code: [.cursorclr] [(int)]');
                    else{
                        let int=parseInt(line);
                        if(int>-1&&int<256)config.cursorclr=int;
                        end(int);
                    }
                }
            }
            ,{//---.history---------------------------------------------------------------------------
                name:'.history'
                ,func:(flag,end,line)=>{
                    if(flag.about)console.log('~> Set max stdin history: [.history] [(int)]');
                    else{
                        let int=parseInt(line);
                        config.history=(int<0)?0:int;
                        end(int);
                    }
                }
            }
            ,{//---exit---------------------------------------------------------------------------
                name:'exit'
                ,func:(flag,end,line)=>{
                    if(flag.about)console.log('~> Exit the process: [exit] [code (optional int)]');
                    else{
                        if(line===undefined)line='0';
                        config.process.stdout.write(config.escape+'[2K',(err)=>{
                            if(err)config.error('exit',err.errno,err.code,err.path,err.message);
                            config.process.exit(parseInt(line));
                        });
                    }
                }
            }
            ,{//---cwd---------------------------------------------------------------------------------------
                name:'cwd'
                ,func:(flag,end)=>{
                    let cwd=config.process.cwd();
                    if(flag.about)console.log('~> Print the current working directory: [cwd]');
                    else{console.log(cwd);end(cwd);}
                }
            }
            ,CMD_cd={//---cd---------------------------------------------------------------------------------------
                name:'cd'
                ,last:config.process.cwd()
                ,func:(flag,end,line)=>{
                    if(flag.about)console.log('~> Change the working directory: [cd] [(string)||(-last)]');
                    else if(line&&line.length>0){
                        let cwd=config.process.cwd(),temperr=false;
                        if(flag.last)line=CMD_cd.last;
                        try{config.process.chdir(line);}
                        catch(err){temperr=true;config.error('cd',err.errno,err.code,err.path,err.message);}
                        if(!temperr){CMD_cd.last=cwd;end(config.process.cwd())}
                    }
                }
            }
            ,{//---mk---------------------------------------------------------------------------------------
                name:'mk'
                ,func:(flag,end,line)=>{
                    if(flag.about)console.log('~> Make a file or directory (ends with \'/\'): [mk] [(string)]');
                    else if(line&&line.length>0){
                        if(line[line.length-1]==='/')mkdir(line,{recursive:true},(err)=>{
                            if(err)config.error('mk',err.errno,err.code,err.path,err.message);
                            else end(line);
                        });
                        else writeFile(line,'',{flag:flag.x?'w':'wx'},(err)=>{
                            if(err){
                                if(err.errno===-2){
                                    let tdir='';
                                    for(let i=line.length-1;i>=0;i--)if(line[i]==='/'){
                                        tdir=line.substring(0,i+1);
                                        break;
                                    }
                                    mkdir(tdir,{recursive:true},(err)=>{
                                        if(err)config.error('mk',err.errno,err.code,err.path,err.message);
                                        else writeFile(line,'',{flag:'w'},(err)=>{
                                            if(err)config.error('mk',err.errno,err.code,err.path,err.message);
                                            else end(line);
                                        });
                                    });
                                }
                                else config.error('mk',err.errno,err.code,err.path,err.message);
                            }
                            else end(line);
                        });
                    }
                }
            }
            ,{//---.fileclr---------------------------------------------------------------------------------------
                name:'.fileclr'
                ,func:(flag,end,line)=>{
                    if(flag.about)console.log('~> Set \'ls\' file color code: [.fileclr] [(int)]');
                    else{
                        let int=parseInt(line);
                        if(int>-1&&int<256)config.fileclr=int;
                        end(int);
                    }
                }
            }
            ,{//---.dirclr---------------------------------------------------------------------------------------
                name:'.dirclr'
                ,func:(flag,end,line)=>{
                    if(flag.about)console.log('~> Set \'ls\' dir color code: [.dirclr] [(int)]');
                    else{
                        let int=parseInt(line);
                        if(int>-1&&int<256)config.dirclr=int;
                        end(int);
                    }
                }
            }
            ,{//---ls---------------------------------------------------------------------------------------
                name:'ls'
                ,func:function(flag,end,line){
                    if(line===undefined)line=config.process.cwd();
                    if(flag.about)console.log('~> List items in the working directory: [ls] [optional(string)]');
                    else if(Array.isArray(line)){
                        console.log(spaceitems(line,''));
                        end(line);
                    }
                    else if(typeof(line)==='string'){
                        if(line.length<1)line=config.process.cwd();
                        readdir(line,{withFileTypes:true},(err,items)=>{
                            if(err)config.error('ls',err.errno,err.code,err.path,err.message);
                            else{
                                let arr=[];
                                items.forEach(item=>arr.push(item.isDirectory()?item.name+'/':item.name));
                                console.log(spaceitems(arr,'',config.dirclr,config.fileclr,'/',-1));
                                end(line);
                            }
                        });
                    }
                }
            }
            ,{//---rm---------------------------------------------------------------------------------------
                name:'rm'
                ,func:(flag,end,line)=>{
                    if(flag.about)console.log('~> Remove a file or directory: [rm] [(string)]');
                    else if(line&&line.length>0){
                        if(line[line.length-1]==='.'||line[line.length-1]==='*'){
                            let dir=line.substring(0,line.length-1);
                            readdir(dir,{withFileTypes:true},(err,files)=>{
                                if(err)config.error('rm',err.errno,err.code,err.path,err.message);
                                else{
                                    let cnt=files.length;
                                    files.forEach((file)=>{
                                        if(file.isFile())unlink(dir+'/'+file.name,(err)=>{
                                            if(err)config.error('rm',err.errno,err.code,err.path,err.message);
                                            else if(--cnt===0)end(dir);
                                        });
                                        else rmdir(dir+'/'+file.name,{recursive:flag.r?true:false},(err)=>{
                                            if(err)config.error('rm',err.errno,err.code,err.path,err.message);
                                            else if(--cnt===0)end(dir);
                                        });
                                    });
                                }
                            });
                        }
                        else rmdir(line,{recursive:flag.r?true:false},(err)=>{
                            if(err){
                                if(err.errno!==-20)config.error('rm',err.errno,err.code,err.path,err.message);
                                else unlink(line,(err)=>{
                                    if(err)config.error('rm',err.errno,err.code,err.path,err.message);
                                    else end(line);
                                });
                            }
                            else end(line);
                        });
                    }
                }
            }
            ,{//---cp---------------------------------------------------------------------------------------
                name:'cp'
                ,func:(flag,end,src,tar)=>{
                    if(flag.about)console.log('~> Copy a file or directory: [cp] src:[(string)] dir:[optional(string)]');
                    else if(src&&src.length>0){
                        let all=false;
                        if(src[src.length-1]==='.'||src[src.length-1]==='*'){src=src.substring(0,src.length-1);all=true;}
                        if(tar===undefined)tar=config.process.cwd();
                        readdir(src,(err)=>{
                            if(err){
                                if(err.errno!==-20)config.error('cp',err.errno,err.code,err.path,err.message);
                                else{//src is file
                                    let name=src,pos=src.lastIndexOf('/');
                                    if(pos>-1)name=name.substring(pos+1);
                                    mkdir(tar,{recursive:true},(err)=>{
                                        if(err){
                                            if(err.errno!==-17)config.err('cp',err.errno,err.code,err.path.err.message);
                                            else if(!existsSync(tar+'/'+name)||flag.x){
                                                let read=createReadStream(src),write=createWriteStream(tar+'/'+name,{flags:flag.x?'w':'wx'}),errstream=false;
                                                read.on('error',(err)=>{config.error('cp',err.errno,err.code,err.path,err.message);errstream=true;});
                                                write.on('error',(err)=>{config.error('cp',err.errno,err.code,err.path,err.message);errstream=true;});
                                                read.pipe(write);
                                                write.on('finish',()=>{if(!errstream)end(tar+'/'+name);});
                                            }
                                            else config.error('mv',-17,'EEXIST',tar+'/'+name);
                                        }
                                        else{
                                            let read=createReadStream(src),write=createWriteStream(tar+'/'+name,{flags:flag.x?'w':'wx'}),errstream=false;
                                            read.on('error',(err)=>{config.error('cp',err.errno,err.code,err.path,err.message);errstream=true;});
                                            write.on('error',(err)=>{config.error('cp',err.errno,err.code,err.path,err.message);errstream=true;});
                                            read.pipe(write);
                                            write.on('finish',()=>{if(!errstream)end(tar+'/'+name);});
                                        }
                                    });
                                }
                            }
                            else{//src is dir
                                let cnt=1;
                                let cpdir=(from,dest)=>{
                                    readdir(from,{withFileTypes:true},(err,files)=>{
                                        if(err)config.error('cp',err.errno,err.code,err.path,err.message);
                                        else{
                                            let cpfiles=()=>{
                                                cnt+=files.length-1;
                                                if(cnt===0){if(all)end(tar);else end(tar+'/'+src);}
                                                else files.forEach((file)=>{
                                                    if(file.isFile()){
                                                        let read=createReadStream(from+'/'+file.name),write=createWriteStream(dest+'/'+file.name,{flags:flag.x?'w':'wx'}),errstream=false;
                                                        read.on('error',(err)=>{config.error('cp',err.errno,err.code,err.path,err.message);errstream=true;});
                                                        write.on('error',(err)=>{config.error('cp',err.errno,err.code,err.path,err.message);errstream=true;});
                                                        read.pipe(write);
                                                        write.on('finish',()=>{if(--cnt===0&&!errstream){if(all)end(tar);else end(tar+'/'+src);}});
                                                    }
                                                    else cpdir(from+'/'+file.name+'/',dest+'/'+file.name+'/');
                                                });
                                            };
                                            mkdir(dest,{recursive:true},(err)=>{
                                                if(err){
                                                    if(err.errno===-17&&flag.x)rmdir(dest,{recursive:true},(err)=>{
                                                        if(err)config.error('cp',err.errno,err.code,err.path,err.message);
                                                        else mkdir(dest,{recursive:true},(err)=>{
                                                            if(err)config.error('cp',err.errno,err.code,err.path,err.message);
                                                            else cpfiles();
                                                        });
                                                    });
                                                    else config.error('cp',err.errno,err.code,err.path,err.message);
                                                }
                                                else cpfiles();
                                            });
                                        }
                                    });
                                };    
                                mkdir(tar,{recursive:true},(err)=>{
                                    if(err)config.error('cp',err.errno,err.code,err.path,err.message);
                                    else if(all)cpdir(src,tar);
                                    else cpdir(src,tar+'/'+src);
                                });
                            }
                        });
                    }
                }
            }
            ,{//---mv---------------------------------------------------------------------------------------
                name:'mv'
                ,func:(flag,end,src,tar)=>{
                    if(flag.about)console.log('~> Move a file or directory: [mv] src:[(string)] dir:[optional(string)]');
                    else if(src&&src.length>0){
                        let all=false;
                        if(src[src.length-1]==='.'||src[src.length-1]==='*'){src=src.substring(0,src.length-1);all=true;}
                        if(tar===undefined)tar=config.process.cwd();
                        readdir(src,(err)=>{
                            if(err){
                                if(err.errno!==-20)config.error('mv',err.errno,err.code,err.path,err.message);
                                else{//src is file
                                    let name=src,pos=src.lastIndexOf('/');
                                    if(pos>-1)name=name.substring(pos+1);
                                    mkdir(tar,{recursive:true},(err)=>{
                                        if(err){
                                            if(err.errno!==-17)config.err('mv',err.errno,err.code,err.path.err.message);
                                            else if(!existsSync(tar+'/'+name)||flag.x)rename(src,tar+'/'+name,(err)=>{
                                                if(err)config.error('mv',err.errno,err.code,err.path,err.message);
                                                else end(tar+'/'+name);
                                            });
                                            else config.error('mv',-17,'EEXIST',tar+'/'+name);
                                        }
                                        else rename(src,tar+'/'+name,(err)=>{
                                            if(err)config.error('mv',err.errno,err.code,err.path,err.message);
                                            else end(tar+'/'+name);
                                        });
                                    });
                                }
                            }
                            else{//src is dir
                                let cnt=1;
                                let mvdir=(from,dest)=>{
                                    readdir(from,{withFileTypes:true},(err,files)=>{
                                        if(err)config.error('mv',err.errno,err.code,err.path,err.message);
                                        else{
                                            let mvfiles=()=>{
                                                cnt+=files.length-1;
                                                if(cnt===0)rmdir(src,{recursive:true},(err)=>{
                                                    if(err)config.error('mv',err.errno,err.code,err.path,err.message);
                                                    else if(all)mkdir(src,{recursive:true},(err)=>{
                                                        if(err)config.error('mv',err.errno,err.code,err.path,err.message);
                                                        else end(tar);
                                                    });
                                                    else end(tar+'/'+src);
                                                });
                                                else files.forEach((file)=>{
                                                    if(file.isFile()){
                                                        if(!existsSync(dest+'/'+file.name)||flag.x)rename(from+'/'+file.name,dest+'/'+file.name,(err)=>{
                                                            if(err)config.error('mv',err.errno,err.code,err.path,err.message);
                                                            else if(--cnt===0)rmdir(src,{recursive:true},(err)=>{
                                                                if(err)config.error('mv',err.errno,err.code,err.path,err.message);
                                                                else if(all)mkdir(src,{recursive:true},(err)=>{
                                                                    if(err)config.error('mv',err.errno,err.code,err.path,err.message);
                                                                    else end(tar);
                                                                });
                                                                else end(tar+'/'+src);
                                                            });
                                                        });
                                                        else config.error('mv',-17,'EEXIST',dest+'/'+file.name+'\'');
                                                    }
                                                    else mvdir(from+'/'+file.name+'/',dest+'/'+file.name+'/');
                                                });
                                            };
                                            mkdir(dest,{recursive:true},(err)=>{
                                                if(err){
                                                    if(err.errno===-17&&flag.x)rmdir(dest,{recursive:true},(err)=>{
                                                        if(err)config.error('mv',err.errno,err.code,err.path,err.message);
                                                        else mkdir(dest,{recursive:true},(err)=>{
                                                            if(err)config.error('mv',err.errno,err.code,err.path,err.message);
                                                            else mvfiles();
                                                        });
                                                    });
                                                    else config.error('mv',err.errno,err.code,err.path,err.message);
                                                }
                                                else mvfiles();
                                            });
                                        }
                                    });
                                };
                                mkdir(tar,{recursive:true},(err)=>{
                                    if(err&&err.errno!==-17)config.error('mv',err.errno,err.code,err.path,err.message);
                                    else if(all)mvdir(src,tar);
                                    else mvdir(src,tar+'/'+src);
                                });
                            }
                        });
                    }
                }
            }
            ,{//---ex---------------------------------------------------------------------------------------
                name:'ex'
                ,func:function(flag,end,line){
                    if(flag.about)console.log('~> Execute system commands in a separate shell: [ex] [(string)]');
                    else if(line&&line.length>0){
                        for(let i=3;i<arguments.length;i++)line+=' '+arguments[i];
                        exec(line,(err,stdout,stderr)=>{
                            if(err)config.error('ex',err.errno,err.code,err.path,err.signal+' '+err.message);
                            else{
                                if(stdout[stdout.length-1]==='\n')stdout=stdout.substring(0,stdout.length-1);
                                end(stdout);
                            }
                        });
                    }
                }
            }
            ,{//---cmds---------------------------------------------------------------------------------------
                name:'cmds'
                ,func:(flag,end)=>{
                    if(flag.about)console.log('~> Print a list of available commands: [cmds]');
                    else{
                        console.log(spaceitems(Object.keys(cmds),'',config.dirclr,config.fileclr,'.',0));
                        end();
                    }
                }
            }
        );
        //===========================================================================================================
        config=require('fstdin')(config);
        delete config.onLine;
        config.prompt(proot);
        //===========================================================================================================
        return config;
    }
};
//================================================================================================================sdg
if(!module.parent)fshell();
else module.exports=fshell;
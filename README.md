# **fshell**

![npm](https://img.shields.io/npm/v/fshell?style=flat-square)
![node](https://img.shields.io/node/v/cu?style=flat-square)
![license](https://img.shields.io/badge/License-MIT-blue.svg)
Made with ![linux](https://img.shields.io/badge/Linux-FCC624?logo=linux&logoColor=black)

</br>

Simple mini shell

</br>

---

- [Initialization](#initialization)
- [Parsing](#parsing)
- [Syntax](#syntax)
    - [Echo](#echo)
    - [Multiple Execution](#multiple-execution)
    - [Multiple Independent Execution](#multiple-independent-execution)
    - [Multiple Dependent Execution](#multiple-dependent-execution)
    - [Pipe](#pipe)
- [Functions](#functions)
    - [.cmd](#cmd)
    - [.addCmd](#addCmd)
    - [.renameCmd](#renameCmd)
    - [.delCmd](#delCmd)
    - [.getCmds](#getCmds)
    - [.addFlag](#addFlag)
    - [.delFlag](#delFlag)
    - [.getFlags](#getFlags)
    - [.error](#error)
- [Flags](#flags)
- [Commands](#commands)
    - [cmds](#cmds)
    - [.cwdclr](#cwdclr)
    - [.textclr](#textclr)
    - [.cursorclr](#cursorclr)
    - [.history](#history)
    - [.fileclr](#fileclr)
    - [.dirclr](#dirclr)
    - [exit](#exit)
    - [cwd](#cwd)
    - [cd](#cd)
    - [ls](#ls)
    - [mk](#mk)
    - [rm](#rm)
    - [cp](#cp)
    - [mv](#mv)
    - [ex](#ex)

</br>

---

## Initialization

</br>

`fshell=require('fshell')({config});`

</br>

Any config properties `undefined` or `typeof()!==` will default to the values listed below:</br>

- `.process: process`
- `.textClr: 15`
- `.cursorClr: 8`
- `.cwdClr: 2`
- `.fileClr: 6`
- `.dirClr: 5`
- `.errClr: 1`
- `.history: 100`
- `.escape: '\x1b'`
- `.onExit: function(code=0)`
- `.onKey: function(key={sequence:'',name:'',ctrl:false,meta:false,shift:false})`

</br>

Returns the config object with the added properties:</br>

- `.cmd: function(str,...) //Call commands`
- `.addCmd: function(obj,...) //Add commands`
- `.renameCmd: function(str,str,...) //Rename commands`
- `.delCmd: function(str,...) //Delete commands`
- `.getCmds: function() //Get array of command names`
- `.addFlag: function(str,...) //Add option`
- `.delFlag: function(str,...) //Delete option`
- `.getFlags: function() //Get array of option strings`
- `.error: function({}||(str,str,str,str,str)) //Log pretty format errors`

[fstdin](https://github.com/Fooeybar/fstdin#readme) properties:

- `.line: '' //Read-only current stdin`
- `.key: function(str||obj,...) //Trigger keys`
- `.prompt: function(obj,...) //Prompt user`
- `.font: function(int) //Returns color code string`
- `.back: function(int) //Returns color code string`

</br>

---

## Parsing

</br>

An incoming string will be parsed first for the `echo echo-in echo-out` flags and the command, ex: `echo ls`</br>
The remainder of the string is parsed as arguments for the command until encountering a space, `|` , `&` , or end of line.

</br>

---

## Syntax

</br>

### Echo

To echo the input, or successful output, or both of a command execution, begin the line with `echo-in`, `echo-out`, or `echo`:</br>

```
'echo-in mk hi/hi.js'

prints:

    [mk-0](hi/hi.js)
    
-----------------------------------------------------------
'echo-out mk hi.js, hello/'

prints: (print order based on async completion)

    [mk-1](hello/)
    [mk-0](hi.js)

-----------------------------------------------------------
'echo ls'

prints:

    [ls-0]()
    ...command output...
    [ls-0](${current directory})

```

</br>

### Multiple Execution

To execute a command multiple times separate the argument sets with a comma `,`:
- `mk hi.js, hello.js`
- `rm hi.js, hello.js`

</br>

### Multiple Independent Execution

To execute multiple independent commands in one line:
- Use a single `&`
- The commands will be executed regardless of the `end()` call of the prior command
- Since most commands are asynchronous, this can cause unexpected behaviour
- `mk hi.js & rm hello.js //expected behaviour`
- `mk hi.js & rm hi.js //unexpected behaviour`

</br>

### Multiple Dependent Execution

To execute multiple dependent commands in one line:
- Use a double `&&`
- The following command will be executed only if the prior command calls the `end()` function
- `mk hi.js && rm hi.js //expected behaviour`

</br>

### Pipe

To pipe the `end()` value of one command into the next command:
- Use a `|`
- The value passed to `end()` from each execution will be spread to the next command in front of any existing arguments</br>

```
'mk hi.js | rm'

make and remove hi.js

-----------------------------------------------------------
'mk hi/hi.js | mv greetings/'

make hi/hi.js recursively and move to greetings/
if greetings/ does not exist it is created

-----------------------------------------------------------
'mk hi.js, greetings/ | mv'

make hi.js and greetings/ and move hi.js into greetings/

```

</br>

---

## Functions

</br>

### cmd

- Execute commands
- Include the command and arguments in one string the same as typing on the command line and pressing return
- Example: `cmd('mk hi/hi.js && rm hi/ -r')`

</br>

### addCmd

- Add a command if not previously defined
- Requires an object with the properties:
    - `.name : ''`
    - `.func : function(){}`
- Functions will always be passed the first two parameters `( flags, end )`; the remaining arguments are spread in order `( flags, end, arg1, arg2, arg3, ...)`
    - `flags` is an object containing the flags passed in the argument set for the command
        ```
        addCmd({
            name:'hw'
            ,func:(flags,end)=>{
                if(flags.about)console.log('I print "Hello world!"');
                else console.log('Hello world!');
            }
        });
        ```
    - `end` is a function, called when the command is fully finished
        - Accepts one argument to pass to a piped command
        - Required for `&`, `&&`, and `|` pipe functionality
        ```
        addCmd({
            name:'hw'
            ,func:(flags,end)=>{
                if(flags.about)console.log('I print "Hello world!"');
                else console.log('Hello world!');
                end('Hello world!');
            }
        });
        ```

</br>

### renameCmd

- Rename a command
- Example: `renameCmd('mv','move','cp','copy')`

</br>

### delCmd

- Delete a command by name
- Example: `delCmd('mv','cp')`

</br>

### getCmds

- Get an array list of command name strings
- Example: `getCmds()`

</br>

### addFlag

- Add a flag if not already defined
- Do not include the `-`
- Example: `addFlag('version')`

</br>

### delFlag

- Delete a flag if defined
- Do not include the `-`
- Example: `delFlag('version')`

</br>

### getFlags

- Get an array list of flag name strings
- Example: `getFlags()`

</br>

### error

- Pretty print error messages
- Pass 5 optional string parameters:
    - `error(command name, errno, code, path, message)`
- Or add the command name to the error object and pass the object as the first parameter
    - `err.cmd = command name`
    - `error(err)`

</br>

---

## Flags

</br>

Flags are options and are parsed out of the argument string.</br>

A flag begins with a dash, ex: `-about -last -r -x`.</br>

Use the `addFlag()` and `delFlag()` functions to add and remove flags.</br>

</br>

The current default flags are:
- `-about`
- Get description of the command. When using the about flag, the corresponding command will not be executed

</br>

- `-last`
- Used with the `cd` command to change directory to the last working directory

</br>

- `-r`
- Recursive flag used with the `rm` command to recursively empty directories

</br>

- `-x`
- Overwrite flag used with the `mk`, `cp`, and `mv` commands to overwrite files and directories when existing

While default flags are removable, they are irreplacable in the default commands.

</br>

---

## Commands

The pre-existing commands may be renamed or deleted.

</br>

### cmds

- Print a list of available commands
- `cmds`

</br>

### cwdclr

- Set the current working directory colour code integer
- `.cwdclr [int]`

</br>

### textclr

- Set the stdin text colour code integer
- `.textclr [int]`

</br>

### cursorclr

- Set the stdin cursor colour code integer
- `.cursorclr [int]`

</br>

### history

- Set the stdin scroll maximum history integer
- `.history [int]`

</br>

### fileclr

- Set the 'ls' command file colour code integer
- `.fileclr [int]`

</br>

### dirclr

- Set the 'ls' command directory colour code integer
- `.dirclr [int]`

</br>

### exit

- Exit the fshell process and call the `onExit()` function; by default `int = 0`
- `exit [optional int]`

</br>

### cwd

- Print the current directory
- `cwd`

</br>

### cd

- Change the current directory
- `cd [directory]`

</br>

### ls

- List a directory or array; by default `directory = current`
- `ls [optional directory]`

</br>

### mk

- Make a file or directory
- Defaults to file, to create a directory add `/` to the name
- Requires the `-x` flag to overwrite existing files
- `mk [file || directory+/]`

```
'mk hi'

makes file named 'hi'

-----------------------------------------------------------
'mk hi/'

makes directory named 'hi'

-----------------------------------------------------------
'mk hi/hi'

makes directory (if non-existant) named 'hi' and makes file named 'hi' in the directory

```

</br>

### rm

- Remove files and directories
- Requires `-r` recursive flag to remove non-empty directory
- `rm [file || directory]`

</br>

### cp

- Copy files and directories to another directory
- Will accept `.` or `*` at the path end to select all inside that directory
- `cp [source file(s) || directory] [target directory]`

```
'mk hi/hi.js,hi/hello.js,hi/yo.js'
'cp hi/ greetings/'

copy the 'hi' directory into the 'greetings' directory (created if non-existant)

-----------------------------------------------------------
'mk hi/hi.js,hi/hello.js,hi/yo.js'
'cp hi/* greetings/'

copy all inside the 'hi' directory into the 'greetings' directory (created if non-existant)

```

</br>

### mv

- Move files and directories to another directory
- Will accept `.` or `*` at the path end to select all inside that directory
- `mv [source file(s) || directory] [target directory]`

```
'mk hi/hi.js,hi/hello.js,hi/yo.js'
'mv hi/ greetings/'

move the 'hi' directory into the 'greetings' directory (created if non-existant)

-----------------------------------------------------------
'mk hi/hi.js,hi/hello.js,hi/yo.js'
'mv hi/* greetings/'

move all inside the 'hi' directory into the 'greetings' directory (created if non-existant)
```

</br>

### ex

- Pass arguments to a separate OS shell process
- `ex [arguments...]`
```
'echo ex echo "Hello world!", "echo Hello back!"'

prints:

    [ex-0](echo, Hello world!)
    [ex-1](echo Hello back!)
    [ex-0](Hello world!)
    [ex-1](Hello back!)

-----------------------------------------------------------
'ex touch hi.js hello.js'

use separate OS shell to create hi.js and hello.js

```

</br>

---
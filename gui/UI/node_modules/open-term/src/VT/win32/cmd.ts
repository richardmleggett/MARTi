import { spawn, SpawnOptions } from "child_process"

import { TerminalExecutor } from "../types"


/**
 * Running command from cmd.
 * 
 * **NOTE:** CMD terminal process will start with `{ shell: true }` **SpawnOption**.
 */
const runCmd: TerminalExecutor = (command: string, {
    detached = true,
    stdio = 'ignore',
    shell = true,
    ...restSpawnOptions
} = {} as SpawnOptions, terminalArgs) => {
    let args = ['/k']
    if (terminalArgs) {
        args = [...terminalArgs]
    }

    const execArgExists = args.find((arg) => !arg.startsWith('/'))
    if (!execArgExists) args.push(command)

    // console.log(args)
    const cmdProcess = spawn('cmd', args, {
        detached,
        stdio,
        shell,
        ...restSpawnOptions
    })
    return cmdProcess
}

export default runCmd



// // test
// const command = 'node tests/test2.js'
// const cmdProcess = runCmd(command)
// if(!cmdProcess.pid) {
//     throw new Error('cmd not found.')
// }
// cmdProcess.unref()
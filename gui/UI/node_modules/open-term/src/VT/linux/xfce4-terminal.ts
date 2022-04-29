import { spawn, SpawnOptions } from "child_process"
import { TerminalExecutor } from "../types"


/**Run command from xfce4-terminal. */
const runXfce: TerminalExecutor = (command: string, {
    detached = true,
    stdio = 'ignore',
    shell = false,
    ...restSpawnOptions
} = {} as SpawnOptions, terminalArgs) => {
    const cwd = process.cwd()

    let args = ['--hold', '--working-directory', cwd]
    if (terminalArgs) {
        args = [...terminalArgs]
    }

    if (!args.includes('-e') && !args.includes('--command') && !args.includes('-x') && !args.includes('--execute')) {
        args.push('-e', command)
    }


    // console.log(args)
    const cmdProcess = spawn('xfce4-terminal', args, {
        detached,
        stdio,
        shell,
        ...restSpawnOptions
    })
    return cmdProcess
}

export default runXfce



// test
// const path = require('path')
// const testPath = path.join(__dirname, './test.js')
// //
// console.log('aaaaaaa')
// const command = `node ${testPath}`
// const cmdProcess = runXfce(command)
// if(!cmdProcess.pid) {
//     throw new Error('xfce4-terminal not found.')
// }
// cmdProcess.unref()
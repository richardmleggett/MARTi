import { spawn, SpawnOptions } from 'child_process'
import { TerminalExecutor } from '../types'


/**Run command from Guake Terminal. */
const runGuake: TerminalExecutor = (command: string, {
    detached = true,
    stdio = 'ignore',
    shell = false,
    ...restSpawnOptions
} = {} as SpawnOptions, terminalArgs) => {
    const cwd = process.cwd()

    let args = ['--show', '-n', cwd]
    
    if (terminalArgs) {
        args = [...terminalArgs]
    }

    if (!args.includes('-e') && !args.includes('--execute-command')) {
        args.push('-e', command)
    }

    // console.log(args)
    const cmdProcess = spawn('guake', args, {
        detached,
        stdio,
        shell,
        ...restSpawnOptions
    })
    return cmdProcess
}

export default runGuake



// // test
// const path = require('path')
// const testPath = path.join(__dirname, './test.js')
// //
// console.log('aaaaaaa')
// const command = `node ${testPath}`
// const cmdProcess = runGuake(command, [])
// if (!cmdProcess.pid) {
//     throw new Error('Cant start process.')
// }
// cmdProcess.unref()
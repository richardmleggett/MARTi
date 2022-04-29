import { spawn, SpawnOptions } from 'child_process'
import { TerminalExecutor } from '../types'


/**Run command from KDE-Konsole Terminal. */
const runKonsole: TerminalExecutor = (command: string, {
    detached = true,
    stdio = 'ignore',
    shell = false,
    ...restSpawnOptions
} = {} as SpawnOptions, terminalArgs) => {
    const cwd = process.cwd()

    let args = ['--hold', '--workdir', cwd]
    if (terminalArgs) {
        args = [...terminalArgs]
    }

    if (!args.includes('-e')) {
        args.push('-e', command)
    }

    // console.log(args)
    const cmdProcess = spawn('konsole', args, {
        detached,
        stdio,
        shell,
        ...restSpawnOptions
    })
    return cmdProcess
}

export default runKonsole



// test
// const path = require('path')
// const testPath = path.join(__dirname, './test.js')
// //
// console.log('aaaaaaa')
// const command = `node ${testPath}`
// const cmdProcess = runKonsole(command, ['--hold', '-e', 'ls'])
// if(!cmdProcess.pid) {
//     throw new Error('Konsole command not found.')
// }
// cmdProcess.unref()
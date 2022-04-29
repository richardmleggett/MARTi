import { ChildProcess } from 'child_process'

import { VT, TerminalExecutor, PlatformsList } from '../VT'
import {
    VTexecConfig,
    SearchConfig,
} from './types'

import {
    NotSupported,
    searchConfigToList,
    setVTexecConfigDefaults,
} from './utils'

import * as searchConfigDefaults from './searchConfigDefaults'


/**This function designed to capture virtual terminal startup errors. */
const omitError = (error: any) => null


/**
 * This function automatically find and run terminal with provided command.
 * @param command - String representation of command.
 */
export default function VTexec(command: string): ChildProcess
/**
 * This function automaticaly find and run terminal with provided command.
 * @param command - String representation of command.
 * @param VTexecConfig - Terminal searching algorithm configuration.
 */
export default function VTexec(command: string, VTexecConfig: VTexecConfig): ChildProcess
export default function VTexec(command: string, VTexecConfig?: VTexecConfig): any {
    const VTexecConfigWithDefaults = setVTexecConfigDefaults(VTexecConfig)

    function findVt(platform: PlatformsList, vtList: string[]) {
        const supportedVtMap = VT[platform] as { [key: string]: TerminalExecutor }
        for (const vt of vtList) {
            const terminalExecutor = supportedVtMap[vt]
            if (terminalExecutor) {
                const termProc = terminalExecutor(command)
                if (termProc.pid) return termProc

                termProc.on('error', omitError)
            }
        }
        throw new Error(`No Virtual Terminal Emulator found for platform: ${platform}, with provided "SearchConfig" in VTexecConfig!`)
    }

    if (typeof command !== 'string') {
        throw new Error('Please provide command string to execute in VT!')
    }
    const platform = process.platform

    if (VTexecConfigWithDefaults[platform] === null) throw new NotSupported(`Platform: ${platform} is not supported!`)

    switch (platform) {
        case 'linux':
        case 'win32':
            const vtList = searchConfigToList(VTexecConfigWithDefaults[platform]! as Required<SearchConfig<PlatformsList>>)
            try {
                return findVt(platform, vtList)
            } catch (err) {
                throw new NotSupported(err.message)
            }
        default:
            break
    }

    if (VTexecConfigWithDefaults.default === null) throw new NotSupported(`Platform: ${platform} is not supported!`)

    for (const fallbackPlatform of VTexecConfigWithDefaults.default) {
        if (Object.keys(VT).includes(fallbackPlatform)) {
            const vtList = searchConfigToList(searchConfigDefaults[fallbackPlatform])
            try {
                return findVt(fallbackPlatform, vtList)
            } catch (err) { }
        }
    }
    throw new NotSupported(`No fallback Virtual Terminal Emulator found in platforms: ${VTexecConfigWithDefaults.default}!`)
}
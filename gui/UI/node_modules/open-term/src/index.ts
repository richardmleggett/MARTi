import { utils } from './VTexec'

/**Determines the impossibility of opening a terminal in the platform. */
export const NotSupported = utils.NotSupported

export {
    VT,
    PlatformsList,
    TerminalExecutor,
} from './VT'
export {
    VTexec,
    SearchConfig,
    VTexecConfig,
    LinuxTerminals,
    Win32Terminals,
    SearchConfigDefaults,
} from './VTexec'
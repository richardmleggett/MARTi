import {
    linux as linuxSearchConfigDefaults,
    win32 as win32SearchConfigDefaults,
} from './searchConfigDefaults'

/****SearchConfig** default values for supported platforms. */
const SearchConfigDefaults = {
    /****SearchConfig** default value for linux. */
    linux: linuxSearchConfigDefaults,
    /****SearchConfig** default value for win32. */
    win32: win32SearchConfigDefaults
}


export {
    SearchConfig,
    VTexecConfig,
    LinuxTerminals,
    Win32Terminals,
} from './types'
export { SearchConfigDefaults }
export * as utils from './utils'
export { default as VTexec } from './VTexec'
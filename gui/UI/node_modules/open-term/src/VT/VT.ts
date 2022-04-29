import * as linuxTerminals from './linux'
import * as win32Terminals from './win32'

/**Supported terminals distributed by platforms.  */
const VT = {
    /**Linux Terminal runners. */
    linux: linuxTerminals,
    /**win32 Terminal runners. */
    win32: win32Terminals,
}

export default VT
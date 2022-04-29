import { PlatformsList, VT } from '../../VT'
import {
    SearchConfig,
    VTexecConfig,
} from "../types"

import {
    linux as linuxSearchConfigDefaults,
    win32 as win32SearchConfigDefaults
} from '../searchConfigDefaults'


function setLinuxSearchConfigDefaults(linuxSearchConfig: SearchConfig<'linux'>): void {
    if (linuxSearchConfig.priorityTerms === undefined) linuxSearchConfig.priorityTerms = linuxSearchConfigDefaults.priorityTerms
    if (linuxSearchConfig.terms === undefined) linuxSearchConfig.terms = linuxSearchConfigDefaults.terms
    if (linuxSearchConfig.excludeTerms === undefined) linuxSearchConfig.excludeTerms = linuxSearchConfigDefaults.excludeTerms
}


function setWin32SearchConfigDefaults(win32SearchConfig: SearchConfig<'win32'>): void {
    if (win32SearchConfig.priorityTerms === undefined) win32SearchConfig.priorityTerms = win32SearchConfigDefaults.priorityTerms
    if (win32SearchConfig.terms === undefined) win32SearchConfig.terms = win32SearchConfigDefaults.terms
    if (win32SearchConfig.excludeTerms === undefined) win32SearchConfig.excludeTerms = win32SearchConfigDefaults.excludeTerms
}

/**
 * This function Set Default values for all missing properties of VTexecConfig.
 * @returns **VTexecConfig** with filled default values.
 */
export default function setVTexecConfigDefaults(config = {} as VTexecConfig): Required<VTexecConfig> {
    let {
        linux = linuxSearchConfigDefaults,
        win32 = win32SearchConfigDefaults,
        default: VTFallbackPlatforms = Object.keys(VT) as PlatformsList[], // undefined - lookall, null - throw NotFound, array - look in array
        ...restConfig
    } = config
    if (linux !== null) setLinuxSearchConfigDefaults(linux)
    if (win32 !== null) setWin32SearchConfigDefaults(win32)
    return { linux, win32, default: VTFallbackPlatforms, ...restConfig }
}
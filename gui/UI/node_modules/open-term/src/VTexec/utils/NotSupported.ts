/**Determines the impossibility of opening a terminal in the platform. */
export default class NotSupported extends Error {
    code = 'NotSupported'
    constructor(message: string) {
        super(message)
    }
}
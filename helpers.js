import {
    createSubmission,
    getSubmission,
    saveWorkspace,
    updateActivityLevelTemplate,
    createAuthorizedWorkspace,
    updateAuthorizedWorkspace,
    updateActivityTemplate,
} from '../../../Utils/requests';
import { message } from 'antd';

const AvrboyArduino = window.AvrgirlArduino;

export const setLocalSandbox = (workspaceRef) => {
    let workspaceDom = window.Blockly.Xml.workspaceToDom(workspaceRef);
    let workspaceText = window.Blockly.Xml.domToText(workspaceDom);
    const localActivity = JSON.parse(localStorage.getItem('sandbox-activity'));

    let lastActivity = { ...localActivity, template: workspaceText };
    localStorage.setItem('sandbox-activity', JSON.stringify(lastActivity));
};

// Generates xml from blockly canvas
export const getXml = (workspaceRef, shouldAlert = true) => {
    const { Blockly } = window;

    let xml = Blockly.Xml.workspaceToDom(workspaceRef);
    let xml_text = Blockly.Xml.domToText(xml);
    if (shouldAlert) alert(xml_text);
    return xml_text;
};

// Generates javascript code from blockly canvas
export const getJS = (workspaceRef) => {
    window.Blockly.JavaScript.INFINITE_LOOP_TRAP = null;
    let code = window.Blockly.JavaScript.workspaceToCode(workspaceRef);
    alert(code);
    return code;
};

// Generates Arduino code from blockly canvas
export const getArduino = (workspaceRef, shouldAlert = true) => {
    window.Blockly.Arduino.INFINITE_LOOP_TRAP = null;
    let code = window.Blockly.Arduino.workspaceToCode(workspaceRef);
    if (shouldAlert) alert(code);
    return code;
};

let intervalId;
const compileFail = (setSelectedCompile, setCompileError, msg) => {
    setSelectedCompile(false);
    message.error('Compile Fail', 3);
    setCompileError(msg);
};
// Sends compiled arduino code to server and returns hex to flash board with

export const compileArduinoCode = async (
    workspaceRef,
    setSelectedCompile,
    setCompileError,
    activity,
    isStudent
) => {
    setSelectedCompile(true);
    const sketch = getArduino(workspaceRef, false);
    let workspaceDom = window.Blockly.Xml.workspaceToDom(workspaceRef);
    let workspaceText = window.Blockly.Xml.domToText(workspaceDom);
    let path;
    isStudent ? (path = '/submissions') : (path = '/sandbox/submission');
    let id = isStudent ? activity.id : undefined;


    // MY CODE BELOW

    try {
        const initialSubmission = await createSubmission(
            id,
            workspaceText,
            sketch,
            path,
            isStudent
        );

        if (!initialSubmission.data) {
            compileFail(
                setSelectedCompile,
                setCompileError,
                'Oops. Something went wrong, please check your internet connection.'
            );
            return;
        }

        intervalId = setInterval(
            async () => {
                const submission = await getAndFlashSubmission( //Initial submission that handles asynchornously
                    initialSubmission.data.id,
                    path,
                    isStudent,
                    setSelectedCompile,
                    setCompileError
                );

                if (submission && submission.status === 'COMPLETE') { //If there is a submission
                    clearInterval(intervalId);
                    intervalId = undefined;

                    if (submission.compilationSuccess) { //When it compiles competly you get a sucess message
                        console.log('Code compiled successfully! :D Works Beautifully'); //Message for sucessful compilation
                    } else { // Compilation failed
                        compileFail(
                            setSelectedCompile,
                            setCompileError,
                            'Code Compilation Failed :( Please Check Again' //Failes compilation message
                        );
                    }
                }
            },
            250
        );

        setTimeout(() => {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = undefined;
                compileFail(
                    setSelectedCompile,
                    setCompileError,
                    'Something went wrong, please try again.'
                );
            }
        }, 20000);
    } catch (error) { //handles compilation failure and other issues
        compileFail(
            setSelectedCompile,
            setCompileError,
            'omething went wrong, please try again.'
        );
    }

    //MY CODE ABOVE


};


const getAndFlashSubmission = async (
    id,
    path,
    isStudent,
    setSelectedCompile,
    setCompileError
) => {
    // get the submission
    const response = await getSubmission(id, path, isStudent);
    // If we fail to retrive submission
    if (!response.data) {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = undefined;
        }
        compileFail(
            setSelectedCompile,
            setCompileError,
            'Oops. Something went wrong, please check your internet connection.'
        );
        return;
    }

    // if the submission is not complete, try again later
    if (response.data.status !== 'COMPLETED') {
        return;
    }

    // If the submission is ready
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
    }
    // flash the board with the output
    await flashArduino(response, setSelectedCompile, setCompileError);
};

const flashArduino = async (response, setSelectedCompile, setCompileError) => {
    if (response.data) {
        // if we get a success status from the submission, send it to arduino
        if (response.data.success) {
            // converting base 64 to hex
            let Hex = atob(response.data.hex).toString();

            const avrgirl = new AvrboyArduino({
                board: 'uno',
                debug: true,
            });

            avrgirl.flash(Hex, (err) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log('done correctly.');
                    message.success('Compile Success', 3);
                    setSelectedCompile(false);
                }
            });
        }
        // else if there is error on the Arduino code, show error
        else if (response.data.stderr) {
            message.error('Compile Fail', 3);
            setSelectedCompile(false);
            setCompileError(response.data.stderr);
        }
    } else {
        message.error(response.err);
    }
};

// save current workspace
export const handleSave = async (activityId, workspaceRef, replay) => {
    let xml = window.Blockly.Xml.workspaceToDom(workspaceRef.current);
    let xml_text = window.Blockly.Xml.domToText(xml);
    return await saveWorkspace(activityId, xml_text, replay);
};

export const handleCreatorSaveActivityLevel = async (activityId, workspaceRef, blocksList) => {
    let xml = window.Blockly.Xml.workspaceToDom(workspaceRef.current);
    let xml_text = window.Blockly.Xml.domToText(xml);

    return await updateActivityLevelTemplate(activityId, xml_text, blocksList);
};

export const handleCreatorSaveActivity = async (activityId, workspaceRef) => {
    let xml = window.Blockly.Xml.workspaceToDom(workspaceRef.current);
    let xml_text = window.Blockly.Xml.domToText(xml);

    return await updateActivityTemplate(activityId, xml_text);
};

export const handleSaveAsWorkspace = async (
    name,
    description,
    workspaceRef,
    blocksList,
    classroomId
) => {
    if (!blocksList) {
        blocksList = [];
    }

    let xml = window.Blockly.Xml.workspaceToDom(workspaceRef.current);
    let xml_text = window.Blockly.Xml.domToText(xml);

    return await createAuthorizedWorkspace(
        name,
        description,
        xml_text,
        blocksList,
        classroomId
    );
};

export const handleUpdateWorkspace = async (id, workspaceRef, blocksList) => {
    if (!blocksList) {
        blocksList = [];
    }
    let xml = window.Blockly.Xml.workspaceToDom(workspaceRef.current);
    let xml_text = window.Blockly.Xml.domToText(xml);

    return await updateAuthorizedWorkspace(id, xml_text, blocksList);
};

import { Modal, Button } from 'antd';
import React, { useState } from 'react';
import { getStudent, getSession, getActivity } from '../../../../Utils/requests';
import './Roster.less';

export default function StudentModal({ linkBtn, student, getFormattedDate }) {
    const [visible, setVisible] = useState(false);
    const [submissions, setSubmissions] = useState([]);


    //MY CODE BELOW

    const [showSubmissions, setShowSubmissions] = useState(false); // State hook for showing submissions
    const [codeModalVisible, setCodeModalVisible] = useState(false); //State hook for showing code

    //MY CODE ABOVE


    const showModal = () => {
        setVisible(true);
    };

    const handleCancel = () => {
        setVisible(false);
    };

    const handleOk = () => {
        setVisible(false);
    };

    const handleViewSubmission = async (id) => {
        try {
            const studentResponse = await getStudent(id);

            const newSubmissions = await Promise.all(
                studentResponse.data.sessions.map(async (session) => {
                    const sessionResponse = await getSession(session.id);

                    const submissionsWithNames = await Promise.all(
                        sessionResponse.data.submissions.map(async (submission) => {
                            const activityResponse = await getActivity(submission.activity);
                            return {
                                ...submission,
                                name: activityResponse.data.lesson_module.name,
                            };
                        })
                    );

                    return submissionsWithNames;
                })
            );

            // Flatten the array of arrays
            const flattenedSubmissions = newSubmissions.flat();
            setSubmissions(flattenedSubmissions);
            setShowSubmissions(true);
            console.log(submissions);
        } catch (error) {
            console.error('Error fetching student data:', error);
            // Handle error, e.g., display an error message to the user
        }
    };


    //MY CODE BELOW

    const handleCodeButtonClick = () => {
        setCodeModalVisible(true); //If pressing code button then set to false allowing pop up window
    };

    const handleCodeModalCancel = () => {
        setCodeModalVisible(false); //Opposite to hide pop up window
    };

    //MY CODE ABOVE


    return (
        <div>
            <button id={linkBtn ? 'link-btn' : null} onClick={showModal}>
                View
            </button>
            <Modal
                // title={student.name}
                visible={visible}
                onCancel={handleCancel}
                footer={[


                    // MY CODE BELOW

                    <Button key='load submission' type='secondary' onClick={() => handleViewSubmission(student.enrolled.id)}>
                        Load Submissions
                    </Button>,
                    <Button key='ok' type='primary' onClick={handleOk}>
                        OK
                    </Button>,
                    <div style={{ marginTop: '20px' }}> <!-- Adds space on top stylistically so there is room between button and results -->
                        {showSubmissions && submissions && submissions.length > 0 ? ( //Checks variable exists
                            submissions.map((submission, index) => ( //Checks submission array and creates element for each submission
                                //Styling to make the submissions pop up look more pleasing and organized
                                //Under the submission button contains submissions
                                //Below is the Submission name followed but when submitted
                                <div style={{ textAlign: 'left' }} key={index}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            Submission for "{submission.name}"
                                            {submission.updated_at}
                                        </div>
                                        <Button key='code' type='primary' //Code button used to get a pop up that shows the code submitted by student
                                                onClick={() => {
                                                    handleCodeButtonClick(); <!-- Allows for window pop up handled in the hook -->
                                                }}
                                                style={{ fontSize: '12px', padding: '1px' }}>
                                            Code <!-- Code button -->
                                        </Button>
                                    </div>
                                </div>
                            )) //Above is the name for the code button
                        ) : (
                            showSubmissions && <div className="pain">No Submissions</div> //Stylistically moves values to left side instead of right
                        )}
                    </div>
                ]}

                //MY CODE ABOVE


            >
                <div id='modal-student-card-header'>
                    <p id='animal'>{student.character}</p>
                    <h1 id='student-card-title'>{student.name}</h1>
                </div>
                <div id='modal-card-content-container'>
                    <div id='description-container'>
                        <p id='label'>Last logged in:</p>
                        <p id='label-info'> {getFormattedDate(student.last_logged_in)}</p>
                        <br></br>
                    </div>
                    <div id='description-container'>
                        <p id='label'>Status:</p>
                        <p id='label-info'>
                            {student.enrolled.enrolled ? 'Enrolled' : 'Unenrolled'}
                        </p>
                    </div>
                </div>
            </Modal>

            <Modal
                visible={codeModalVisible}
                onCancel={handleCodeModalCancel}
                footer={null}
            >
                <div>
                    <p>ITS NOT WORKING :(</p>
                </div>
            </Modal>

        </div>
    );
}gti
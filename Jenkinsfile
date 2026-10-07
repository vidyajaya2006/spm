pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                checkout scm
            }
        }

        stage('Unit Tests') {
    steps {
        echo 'Running unit tests...'
        bat 'C:\\Windows\\System32\\cmd.exe /c python -m pytest -v'
    }
}

        stage('Docker Build') {
            steps {
                echo 'Building Docker image...'
                bat 'docker build -t personal-finance-tracker:1.0 .'
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed. Check the console output.'
        }
    }
}
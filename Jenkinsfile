pipeline {
    agent any

    environment {
        PATH = "C:\\Windows\\System32;C:\\Windows\\System32\\WindowsPowerShell\\v1.0;C:\\Program Files\\Docker\\Docker\\resources\\bin;${env.PATH}"
    }

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
                bat 'python -m pytest -v'
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
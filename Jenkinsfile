pipeline {
    agent any  // runs on any available node

    environment {
        DOCKER_REGISTRY = 'haboubi'
        IMAGE_NAME = 'food-delivery'
        SONAR_HOST_URL = 'http://10.233.53.139:9000'
        SONAR_AUTH_TOKEN = credentials('sonar-token')
    }

    tools {
        nodejs 'NodeJS-20.21'  // Updated to match package requirements
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/belhazzh5/Food-Delivery-MyOwn.git'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    cd backend && npm install || true
                    cd ../frontend && npm install || true
                '''
            }
        }

        stage('SAST - SonarQube') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh """
                        ${tool 'SonarQubeScanner'}/bin/sonar-scanner \
                            -Dsonar.projectKey=Food-Delivery-MyOwn \
                            -Dsonar.sources=. \
                            -Dsonar.exclusions=node_modules/**,dist/**,build/**
                    """
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: false
                }
            }
        }

        stage('Dependency Checks') {
            parallel {
                stage('npm Audit') {
                    steps {
                        sh 'cd backend && npm audit --audit-level=high || true'
                    }
                }
                stage('OWASP Dependency-Check') {
                    steps {
                        dependencyCheck(
                            additionalArguments: '--scan ./backend --scan ./frontend --format HTML --format JSON --prettyPrint',
                            odcInstallation: 'OWASP-DC'
                        )
                        dependencyCheckPublisher pattern: '**/dependency-check-report.json'
                    }
                }
            }
        }

        stage('Install Trivy') {
            steps {
                sh '''
                    curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
                    trivy --version
                '''
            }
        }

        stage('Build Images & Trivy Scan') {
            steps {
                script {
                    docker.build("${DOCKER_REGISTRY}/food-backend:latest", "./backend")
                    docker.build("${DOCKER_REGISTRY}/food-frontend:latest", "./frontend")
                }
                sh '''
                    trivy image --severity HIGH,CRITICAL --format json --output trivy-backend.json ${DOCKER_REGISTRY}/food-backend:latest || true
                    trivy image --severity HIGH,CRITICAL --format json --output trivy-frontend.json ${DOCKER_REGISTRY}/food-frontend:latest || true
                '''
            }
        }

        stage('Unit Tests') {
            parallel {
                stage('Backend') {
                    steps {
                        sh 'cd backend && npm test || true'
                    }
                }
                stage('Frontend') {
                    steps {
                        sh 'cd frontend && npm test -- --watchAll=false || true'
                    }
                }
            }
        }

        // Optional: Add DAST / Deployment stages later
    }

    post {
        always {
            deleteDir()  // cleans workspace after every build
        }
    }
}


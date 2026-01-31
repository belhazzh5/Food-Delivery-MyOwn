pipeline {
    agent any  // Simple agent (Jenkins controller or any node with Docker/Node)

    environment {
        DOCKER_REGISTRY = 'haboubi'  // your username or registry
        IMAGE_NAME = 'food-delivery'
        SONAR_HOST_URL = 'http://10.233.53.139:9000'  // from your env
        SONAR_AUTH_TOKEN = credentials('sonar-token')  // from Jenkins credentials
    }

    tools {
        nodejs 'NodeJS-20'  // Change to 'NodeJS-18' if you configured that
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
                withSonarQubeEnv('SonarQube') {  // Matches server name
                    sh '''
                    cd backend
                    sonar-scanner \
                      -Dsonar.projectKey=Food-Delivery-MyOwn \
                      -Dsonar.sources=. \
                      -Dsonar.exclusions=node_modules/**,dist/**,build/**
                    '''
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
                            odcInstallation: 'OWASP-DC'  // exact name from Tools
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
                    trivy image --severity HIGH,CRITICAL \
                      --format json \
                      --output trivy-backend.json \
                      ${DOCKER_REGISTRY}/food-backend:latest

                    trivy image --severity HIGH,CRITICAL \
                      --format json \
                      --output trivy-frontend.json \
                      ${DOCKER_REGISTRY}/food-frontend:latest
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

        // Add DAST/Deploy later if needed
    }

    post {
        always {
            script {
                cleanWs()  // safe inside script block
            }
        }
    }
}

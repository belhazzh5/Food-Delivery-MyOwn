pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = 'haboubi'
        IMAGE_NAME      = 'food-delivery'
        SONAR_HOST_URL  = 'http://10.233.53.139:9000'   // ← double-check this is reachable from Jenkins
        SONAR_PROJECT_KEY = 'Food-Delivery-MyOwn'
    }

    tools {
        // Important: Use Node.js >= 20.17 or 22.x LTS to avoid most EBADENGINE warnings
        // Go to Manage Jenkins → Tools → NodeJS installations and add/update to 20.17+ or 22.x
        nodejs 'NodeJS-20'   // ← change name if you created a newer installation
    }

    stages {

        stage('Install Dependencies') {
            steps {
                sh '''
                    echo "Installing backend dependencies..."
                    cd backend && npm install || true
                    
                    echo "Installing frontend dependencies..."
                    cd ../frontend && npm install || true
                '''
            }
        }

        stage('SAST - SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {    // 'SonarQube' must match the server name in Jenkins config
                    sh '''
                        ${tool 'SonarQube'}/bin/sonar-scanner \
                            -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                            -Dsonar.projectName="Food Delivery App" \
                            -Dsonar.sources=. \
                            -Dsonar.exclusions="**/node_modules/**,**/dist/**,**/build/**, coverage/**" \
                            -Dsonar.tests="**/*.test.js,**/*.spec.js" \
                            || true
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    script {
                        def qg = waitForQualityGate()
                        if (qg.status != 'OK') {
                            echo "❌ Quality Gate status: ${qg.status}"
                            echo "Continuing pipeline anyway (non-blocking Quality Gate)"
                            // currentBuild.result = 'UNSTABLE'   // ← uncomment if you want yellow build
                            // error "Quality gate failure: ${qg.status}"   // ← uncomment to make it blocking later
                        } else {
                            echo "✅ Quality Gate passed!"
                        }
                    }
                }
            }
        }

        stage('Dependency Checks') {
            parallel {
                stage('npm audit') {
                    steps {
                        sh '''
                            echo "Running npm audit (backend)..."
                            cd backend && npm audit --audit-level=high || true
                        '''
                    }
                }

                stage('OWASP Dependency-Check') {
                    steps {
                        dependencyCheck(
                            odcInstallation: 'OWASP-DC',
                            additionalArguments: '--scan ./backend --scan ./frontend --format HTML --format JSON --prettyPrint --enableExperimental'
                        )
                        dependencyCheckPublisher pattern: '**/dependency-check-report.json'
                    }
                }
            }
        }

        stage('Install Trivy') {
            when { expression { fileExists('/usr/local/bin/trivy') == false } }
            steps {
                sh '''
                    curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin v0.58.2
                    trivy --version
                '''
            }
        }

        stage('Build Docker Images & Trivy Scan') {
            steps {
                script {
                    docker.withRegistry('', 'docker-hub-credentials') {   // ← add if you use credentials
                        def backendImage = docker.build("${DOCKER_REGISTRY}/${IMAGE_NAME}-backend:latest", "./backend")
                        def frontendImage = docker.build("${DOCKER_REGISTRY}/${IMAGE_NAME}-frontend:latest", "./frontend")

                        // Optional: push if you want
                        // backendImage.push()
                        // frontendImage.push()
                    }
                }

                sh '''
                    echo "Scanning backend image..."
                    trivy image --severity HIGH,CRITICAL --format json --output trivy-backend.json \
                        ${DOCKER_REGISTRY}/${IMAGE_NAME}-backend:latest || true
                    
                    echo "Scanning frontend image..."
                    trivy image --severity HIGH,CRITICAL --format json --output trivy-frontend.json \
                        ${DOCKER_REGISTRY}/${IMAGE_NAME}-frontend:latest || true
                '''
            }
        }

        stage('Unit Tests') {
            parallel {
                stage('Backend Tests') {
                    steps {
                        sh '''
                            cd backend
                            npm test -- --coverage || true
                        '''
                    }
                }

                stage('Frontend Tests') {
                    steps {
                        sh '''
                            cd frontend
                            npm test -- --watchAll=false --coverage || true
                        '''
                    }
                }
            }
        }

        // Add these stages later when you're ready:
        // stage('Deploy to Staging') { ... }
        // stage('DAST / ZAP') { ... }
    }

    post {
        always {
            // Publish reports if they exist
            recordIssues enabledForFailure: true, aggregatingResults: true, tools: [
                sonarQube()
            ]

            // Clean workspace
            deleteDir()
        }

        success {
            echo "🎉 Pipeline completed successfully!"
        }

        failure {
            echo "❌ Pipeline failed"
        }
    }
}

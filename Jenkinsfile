pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = "haboubi"
        K8S_NAMESPACE = "food-delivery"
        SONAR_HOST_URL = "http://10.233.53.139:9000"
        SONAR_AUTH_TOKEN = credentials('sonar-token')
    }

    tools {
        nodejs 'NodeJS 18' // Make sure your Jenkins NodeJS installation is named exactly this
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/belhazzh5/Food-Delivery-MyOwn.git'
            }
        }

        stage('Install Deps') {
            steps {
                sh 'cd backend && npm install'
                sh 'cd frontend && npm install'
            }
        }

        stage('SAST (Sonar)') {
            steps {
                script {
                    def scannerHome = tool name: 'SonarQube-K8s', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
                    withSonarQubeEnv('SonarQube-K8s') {
                        sh """
                            cd backend
                            ${scannerHome}/bin/sonar-scanner \
                              -Dsonar.projectKey=Food-Delivery-MyOwn \
                              -Dsonar.sources=. \
                              -Dsonar.javascript.lcov.reportPaths=**/coverage/lcov.info \
                              -Dsonar.exclusions=node_modules/**,dist/**,build/**
                        """
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Dependency Check') {
            steps {
                sh 'cd backend && npm audit --audit-level=high'
            }
        }

        stage('Unit Tests') {
            parallel(
                "Backend Tests": {
                    dir('backend') {
                        sh 'npm test'
                        archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
                    }
                },
                "Frontend Tests": {
                    dir('frontend') {
                        sh 'npm test -- --coverage --watchAll=false'
                        archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
                    }
                }
            )
        }

        stage('Build Docker Images') {
            steps {
                sh """
                    podman build -t $DOCKER_REGISTRY/food-backend:latest ./backend
                    podman build -t $DOCKER_REGISTRY/food-frontend:latest ./frontend
                    podman push $DOCKER_REGISTRY/food-backend:latest
                    podman push $DOCKER_REGISTRY/food-frontend:latest
                """
            }
        }

        stage('Deploy to K8s') {
            steps {
                sh """
                    kubectl apply -f kubernetes/ --namespace $K8S_NAMESPACE
                    kubectl rollout restart deployment/backend -n $K8S_NAMESPACE
                    kubectl rollout restart deployment/frontend -n $K8S_NAMESPACE
                """
            }
        }

    } // end stages
}


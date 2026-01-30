pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
metadata:
  labels:
    jenkins: pipeline
spec:
  containers:
  - name: jnlp
    image: jenkins/inbound-agent:alpine-jdk21
    args: ['${computer.jnlpmac}', '${computer.name}']
  - name: kaniko
    image: gcr.io/kaniko-project/executor:debug
    imagePullPolicy: Always
    command:
    - sleep
    args:
    - 99d
    volumeMounts:
    - name: kaniko-secret
      mountPath: /kaniko/.docker
  volumes:
  - name: kaniko-secret
    secret:
      secretName: regcred
'''
        }
    }

    environment {
        DOCKER_REGISTRY = "haboubi"
        K8S_NAMESPACE   = "food-delivery"
        SONAR_HOST_URL  = "http://10.233.53.139:9000"
        SONAR_AUTH_TOKEN = credentials('sonar-token')
    }

    tools {
        nodejs 'NodeJS 20'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/belhazzh5/Food-Delivery-MyOwn.git'
            }
        }

        stage('Install Deps') {
            steps {
                sh '''
                cd backend && npm install
                cd ../frontend && npm install
                '''
            }
        }

        stage('SAST (Sonar)') {
            steps {
                script {
                    def scannerHome = tool 'SonarQube-K8s'
                    withSonarQubeEnv('SonarQube-K8s') {
                        sh """
                        cd backend
                        ${scannerHome}/bin/sonar-scanner \
                          -Dsonar.projectKey=Food-Delivery-MyOwn \
                          -Dsonar.sources=. \
                          -Dsonar.exclusions=node_modules/**,dist/**,build/**
                        """
                    }
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

        stage('Dependency Check') {
            steps {
                sh 'cd backend && npm audit --audit-level=high || true'
            }
        }

        stage('Unit Tests') {
            parallel {
                stage('Backend Tests') {
                    steps {
                        sh 'cd backend && npm test || true'
                    }
                }
                stage('Frontend Tests') {
                    steps {
                        sh 'cd frontend && npm test -- --watchAll=false || true'
                    }
                }
            }
        }

        stage('Build & Push Images (Kaniko)') {
            steps {
                container('kaniko') {
                    sh '''
                    echo "Running inside Kaniko container"
                    ls -la /kaniko
                    /kaniko/executor --version || echo "Kaniko version check failed"

                    # Build & push backend
                    /kaniko/executor \
                      --context dir://${WORKSPACE}/backend \
                      --dockerfile ${WORKSPACE}/backend/Dockerfile \
                      --destination ${DOCKER_REGISTRY}/food-backend:latest \
                      --cache=true \
                      --verbosity info || echo "Backend build failed"

                    # Build & push frontend
                    /kaniko/executor \
                      --context dir://${WORKSPACE}/frontend \
                      --dockerfile ${WORKSPACE}/frontend/Dockerfile \
                      --destination ${DOCKER_REGISTRY}/food-frontend:latest \
                      --cache=true \
                      --verbosity info || echo "Frontend build failed"
                    '''
                }
            }
        }

        stage('Deploy to K8s') {
            steps {
                sh '''
                kubectl apply -f kubernetes/ -n ${K8S_NAMESPACE}
                kubectl rollout restart deployment/backend -n ${K8S_NAMESPACE}
                kubectl rollout restart deployment/frontend -n ${K8S_NAMESPACE}
                '''
            }
        }
    }

    post {
        always {
            echo "Pipeline finished - check logs for details"
        }
    }
}

pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = "haboubi"
        K8S_NAMESPACE = "food-delivery"
        SONAR_HOST_URL = "http://10.233.53.139:9000"
        SONAR_AUTH_TOKEN = credentials('sonar-token')
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',  credentialsId: 'github-pat' ,url: 'https://github.com/belhazzh5/Food-Delivery-MyVersion.git'
            }
        }

        stage('Install Deps') {
            steps {
                sh 'cd backend && npm install'
                sh 'cd ../frontend && npm install'
            }
        }

        stage('SAST (Sonar)') {
            steps {
                sh '''
                cd backend
                sonar-scanner \
                  -Dsonar.projectKey=Food-Delivery-MyVersion \
                  -Dsonar.host.url=$SONAR_HOST_URL \
                  -Dsonar.login=$SONAR_AUTH_TOKEN
                '''
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
            steps {
                sh 'cd backend && npm test'
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                podman build -t $DOCKER_REGISTRY/food-backend:latest ./backend
                podman build -t $DOCKER_REGISTRY/food-frontend:latest ./frontend
                podman push $DOCKER_REGISTRY/food-backend:latest
                podman push $DOCKER_REGISTRY/food-frontend:latest
                '''
            }
        }

        stage('Deploy to K8s') {
            steps {
                sh '''
                kubectl apply -f kubernetes/ --namespace $K8S_NAMESPACE
                kubectl rollout restart deployment/backend -n $K8S_NAMESPACE
                kubectl rollout restart deployment/frontend -n $K8S_NAMESPACE
                '''
            }
        }
    }
}


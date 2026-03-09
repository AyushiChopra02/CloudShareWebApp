#!/bin/sh
echo "Waiting for MySQL at mysql-container:3306..."
until nc -z mysql-container 3306; do
  sleep 2
done
echo "MySQL is up! Starting backend..."
exec java -jar /app/app.jar
# Backend
This service is running the backend of the visual testing server, which is receiving rendered images, generates comparison images and collates the result into a form usable by the frontend. The backend is accessible through a limited set of HTTP/HTTP APIs.

This service also keeps track of a set of reference images.

## API
The available API endpoints can be queried through the `/api` endpoint (for example [http://localhost:8000/api](http://localhost:8000/api)). This endpoint also contains all of the description for the available functions and which parameters they take. Note that some require elevated priviledges, which means that an `adminToken` has to be passed along with the request, which matches the `adminToken` provided in the `config.json` when starting the server.

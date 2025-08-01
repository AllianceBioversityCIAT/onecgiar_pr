import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserSearchService } from './user-search-service.service';
import { UserSearchResponse } from '../models/userSearchResponse';
import { environment } from '../../../../../../../../environments/environment';

describe('UserSearchService', () => {
  let service: UserSearchService;
  let httpMock: HttpTestingController;

  const mockUserSearchResponse: UserSearchResponse = {
    message: 'Users found successfully',
    response: [
      {
        cn: 'John Doe',
        displayName: 'John Doe',
        mail: 'john.doe@cgiar.org',
        sAMAccountName: 'jdoe',
        givenName: 'John',
        sn: 'Doe',
        userPrincipalName: 'john.doe@cgiar.org',
        title: 'Senior Researcher',
        department: 'Research Department',
        company: 'CGIAR',
        manager: 'CN=Jane Smith,OU=Users,DC=cgiar,DC=org',
        employeeID: '12345',
        employeeNumber: 'EMP001',
        employeeType: 'Full-time',
        description: 'Senior researcher in agricultural sciences',
        formattedName: 'Doe, John (john.doe@cgiar.org)'
      }
    ],
    status: 200
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserSearchService]
    });
    service = TestBed.inject(UserSearchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should search users successfully', () => {
    const query = 'john.doe';
    const expectedUrl = `${environment.apiBaseUrl}auth/users/search?q=${query}`;

    service.searchUsers(query).subscribe(response => {
      expect(response).toEqual(mockUserSearchResponse);
      expect(response.response.length).toBe(1);
      expect(response.response[0].displayName).toBe('John Doe');
      expect(response.response[0].mail).toBe('john.doe@cgiar.org');
      expect(response.status).toBe(200);
    });

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockUserSearchResponse);
  });

  it('should handle empty search results', () => {
    const query = 'nonexistent';
    const emptyResponse: UserSearchResponse = {
      message: 'No users found',
      response: [],
      status: 200
    };
    const expectedUrl = `${environment.apiBaseUrl}auth/users/search?q=${query}`;

    service.searchUsers(query).subscribe(response => {
      expect(response).toEqual(emptyResponse);
      expect(response.response.length).toBe(0);
    });

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    req.flush(emptyResponse);
  });

  it('should handle HTTP error responses', () => {
    const query = 'test';
    const expectedUrl = `${environment.apiBaseUrl}auth/users/search?q=${query}`;
    const errorMessage = 'Server error';

    service.searchUsers(query).subscribe({
      next: () => fail('Expected an error, but got a successful response'),
      error: error => {
        expect(error.status).toBe(500);
        expect(error.statusText).toBe('Internal Server Error');
      }
    });

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    req.flush(errorMessage, { status: 500, statusText: 'Internal Server Error' });
  });

  it('should encode query parameters correctly', () => {
    const query = 'john doe@test';
    const expectedUrl = `${environment.apiBaseUrl}auth/users/search?q=${query}`;

    service.searchUsers(query).subscribe();

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.url).toBe(expectedUrl);
    req.flush(mockUserSearchResponse);
  });

  it('should handle multiple users in response', () => {
    const query = 'doe';
    const multipleUsersResponse: UserSearchResponse = {
      message: 'Users found successfully',
      response: [
        {
          cn: 'John Doe',
          displayName: 'John Doe',
          mail: 'john.doe@cgiar.org',
          sAMAccountName: 'jdoe',
          givenName: 'John',
          sn: 'Doe',
          userPrincipalName: 'john.doe@cgiar.org',
          title: 'Senior Researcher',
          department: 'Research Department',
          company: 'CGIAR',
          manager: 'CN=Jane Smith,OU=Users,DC=cgiar,DC=org',
          employeeID: '12345',
          employeeNumber: 'EMP001',
          employeeType: 'Full-time',
          description: 'Senior researcher in agricultural sciences',
          formattedName: 'Doe, John (john.doe@cgiar.org)'
        },
        {
          cn: 'Jane Doe',
          displayName: 'Jane Doe',
          mail: 'jane.doe@cgiar.org',
          sAMAccountName: 'jadoe',
          givenName: 'Jane',
          sn: 'Doe',
          userPrincipalName: 'jane.doe@cgiar.org',
          title: 'Research Assistant',
          department: 'Research Department',
          company: 'CGIAR',
          manager: 'CN=John Smith,OU=Users,DC=cgiar,DC=org',
          employeeID: '12346',
          employeeNumber: 'EMP002',
          employeeType: 'Part-time',
          description: 'Research assistant in agricultural sciences',
          formattedName: 'Doe, Jane (jane.doe@cgiar.org)'
        }
      ],
      status: 200
    };

    service.searchUsers(query).subscribe(response => {
      expect(response.response.length).toBe(2);
      expect(response.response[0].displayName).toBe('John Doe');
      expect(response.response[1].displayName).toBe('Jane Doe');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}auth/users/search?q=${query}`);
    req.flush(multipleUsersResponse);
  });
});

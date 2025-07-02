import { ApiProperty } from '@nestjs/swagger';

export class AdUserDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Common name',
    example: 'John Doe',
    required: false,
  })
  cn?: string;

  @ApiProperty({
    description: 'Display name',
    example: 'John Doe',
    required: false,
  })
  display_name?: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@cgiar.org',
  })
  mail: string;

  @ApiProperty({
    description: 'SAM Account Name',
    example: 'jdoe',
    required: false,
  })
  sam_account_name?: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
    required: false,
  })
  given_name?: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
    required: false,
  })
  sn?: string;

  @ApiProperty({
    description: 'User principal name',
    example: 'john.doe@cgiar.org',
    required: false,
  })
  user_principal_name?: string;

  @ApiProperty({
    description: 'Job title',
    example: 'Senior Developer',
    required: false,
  })
  title?: string;

  @ApiProperty({
    description: 'Department',
    example: 'Information Technology',
    required: false,
  })
  department?: string;

  @ApiProperty({
    description: 'Company',
    example: 'CGIAR',
    required: false,
  })
  company?: string;

  @ApiProperty({
    description: 'Manager',
    example: 'Jane Smith',
    required: false,
  })
  manager?: string;

  @ApiProperty({
    description: 'Employee ID',
    example: 'EMP001',
    required: false,
  })
  employee_id?: string;

  @ApiProperty({
    description: 'Employee number',
    example: '12345',
    required: false,
  })
  employee_number?: string;

  @ApiProperty({
    description: 'Employee type',
    example: 'Full-time',
    required: false,
  })
  employee_type?: string;

  @ApiProperty({
    description: 'Description',
    example: 'Senior software developer with expertise in TypeScript',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Whether the user is active',
    example: true,
  })
  is_active: boolean;

  @ApiProperty({
    description: 'When the record was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'When the record was last updated',
    example: '2024-01-01T00:00:00.000Z',
  })
  updated_at: Date;

  @ApiProperty({
    description: 'When the user data was last synced from AD',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  last_synced_at?: Date;
}

export class SearchUsersResponseDto {
  @ApiProperty({
    description: 'Array of users found',
    type: [AdUserDto],
  })
  users: AdUserDto[];

  @ApiProperty({
    description: 'Whether the results came from local cache',
    example: true,
  })
  fromCache: boolean;

  @ApiProperty({
    description: 'Total number of users found',
    example: 5,
  })
  totalFound: number;
}

export class ValidateEmailResponseDto {
  @ApiProperty({
    description: 'Whether the email is valid',
    example: true,
  })
  isValid: boolean;

  @ApiProperty({
    description: 'User data if valid',
    type: AdUserDto,
    required: false,
  })
  user?: AdUserDto;

  @ApiProperty({
    description: 'Error message if invalid',
    example: 'User not found in Active Directory',
    required: false,
  })
  error?: string;
}

import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import {
  CLOUD_STORAGE_LINK_MESSAGE,
  isCloudStorageLink,
} from '../constants/cloud-storage-link.constant';

@ValidatorConstraint({ name: 'isNotCloudStorageLink', async: false })
export class IsNotCloudStorageLinkConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    // Absent or non-string values are somebody else's rule (@IsNotEmpty, @IsUrl).
    if (typeof value !== 'string') {
      return true;
    }
    return !isCloudStorageLink(value);
  }

  defaultMessage(_args: ValidationArguments): string {
    return CLOUD_STORAGE_LINK_MESSAGE;
  }
}

/**
 * Rejects links hosted on the file-storage platforms PRMS does not accept as evidence.
 * See `cloud-storage-link.constant.ts` for why the rule exists and where it is mirrored.
 */
export function IsNotCloudStorageLink(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNotCloudStorageLinkConstraint,
    });
  };
}

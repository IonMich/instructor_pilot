import os


def delete_versions(assignment):
    """Delete all versions of an assignment."""
    # delete the old versions if any
    try:
        assignment.version_set.all().delete()
    except Exception as e:
        print("No versions to delete")
        pass
    finally:
        assignment.versioned = False
        assignment.save()

def versionfile_upload_to(instance, filename):
    """
    Return the relative path where the version file should be saved.
    """
    return os.path.join(
        "submissions",
        f"course_{instance.version.assignment.course.pk}",
        f"assignment_{instance.version.assignment.pk}",
        "comment",
        filename)
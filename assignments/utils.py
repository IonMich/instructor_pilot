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